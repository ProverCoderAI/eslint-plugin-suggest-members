// CHANGE: TypeScript module-level effects
// WHY: resolve module exports + signatures
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<T, TypeScriptServiceError>
// INVARIANT: module resolution is deterministic
// COMPLEXITY: O(n)/O(1)
import { Effect, pipe } from "effect"
import * as ts from "typescript"

import type { TypeScriptServiceError } from "../effects/errors.js"
import { makeModuleNotFoundError, makeTypeCheckerUnavailableError, makeTypeResolutionError } from "../effects/errors.js"
import { getNodeBuiltinExports, isNodeBuiltinModule } from "./node-builtin-exports.js"
import { findContextFile, findModuleSymbol } from "./typescript-compiler-helpers.js"
import { createUndefinedResultEffect, formatTypeName, formatTypeSignature } from "./typescript-effect-utils.js"

export const tryGetBuiltinExports = (
  modulePath: string
): ReadonlyArray<string> | null => {
  if (!isNodeBuiltinModule(modulePath)) return null
  return getNodeBuiltinExports(modulePath) ?? null
}

export const resolveContextFileEffect = (
  program: ts.Program,
  modulePath: string,
  containingFilePath?: string
): Effect.Effect<ts.SourceFile, TypeScriptServiceError> =>
  Effect.try({
    try: () => {
      if (containingFilePath) {
        const direct = program.getSourceFile(containingFilePath)
        if (direct) return direct
      }

      const fallback = findContextFile(program)
      if (!fallback) {
        throw new Error("context-file-not-found")
      }
      return fallback
    },
    catch: () => makeModuleNotFoundError(modulePath)
  })

export const resolveModuleSymbolEffect = (
  checker: ts.TypeChecker,
  program: ts.Program,
  modulePath: string,
  contextFile: ts.SourceFile
): Effect.Effect<ts.Symbol, TypeScriptServiceError> =>
  Effect.try({
    try: () => {
      const symbol = findModuleSymbol(checker, program, modulePath, contextFile)
      if (!symbol) {
        throw new Error("module-symbol-not-found")
      }
      return symbol
    },
    catch: () => makeModuleNotFoundError(modulePath)
  })

const filterExportSymbols = (
  symbols: ReadonlyArray<ts.Symbol>
): Array<string> => {
  const names: Array<string> = []

  for (const symbol of symbols) {
    names.push(symbol.getName())
  }

  return names
}

interface ModuleContext {
  readonly moduleSymbol: ts.Symbol
  readonly contextFile: ts.SourceFile
}

interface ModuleLookupParams {
  readonly modulePath: string
  readonly containingFilePath?: string
}

const resolveModuleContextEffect = (
  checker: ts.TypeChecker,
  program: ts.Program,
  modulePath: string,
  containingFilePath?: string
): Effect.Effect<ModuleContext, TypeScriptServiceError> =>
  pipe(
    resolveContextFileEffect(program, modulePath, containingFilePath),
    Effect.flatMap((contextFile) =>
      pipe(
        resolveModuleSymbolEffect(checker, program, modulePath, contextFile),
        Effect.map((moduleSymbol) => ({ moduleSymbol, contextFile }))
      )
    )
  )

const createModuleLookupEffect = <T, TParams extends ModuleLookupParams>(
  checker: ts.TypeChecker | undefined,
  program: ts.Program | undefined,
  build: (
    availableChecker: ts.TypeChecker,
    moduleSymbol: ts.Symbol,
    contextFile: ts.SourceFile,
    params: TParams
  ) => Effect.Effect<T | undefined, TypeScriptServiceError>
) => {
  if (!checker || !program) {
    return createUndefinedResultEffect<T>()
  }

  return (params: TParams): Effect.Effect<T | undefined, TypeScriptServiceError> =>
    pipe(
      resolveModuleContextEffect(
        checker,
        program,
        params.modulePath,
        params.containingFilePath
      ),
      Effect.flatMap(({ contextFile, moduleSymbol }) => build(checker, moduleSymbol, contextFile, params)),
      Effect.catchAll(() => Effect.sync((): T | undefined => undefined))
    )
}

export const createGetExportsOfModuleEffect = (
  checker: ts.TypeChecker | undefined,
  program: ts.Program | undefined
) =>
(
  modulePath: string,
  containingFilePath?: string
): Effect.Effect<ReadonlyArray<string>, TypeScriptServiceError> =>
  Effect.gen(function*(_) {
    const builtin = tryGetBuiltinExports(modulePath)
    if (builtin) return builtin

    if (!checker || !program) {
      return yield* _(Effect.fail(makeTypeCheckerUnavailableError()))
    }

    const contextFile = yield* _(
      resolveContextFileEffect(program, modulePath, containingFilePath)
    )
    const moduleSymbol = yield* _(
      resolveModuleSymbolEffect(checker, program, modulePath, contextFile)
    )

    const exportSymbols = checker.getExportsOfModule(moduleSymbol)
    return filterExportSymbols(exportSymbols)
  })

const resolveModuleNameEffect = (
  program: ts.Program,
  modulePath: string,
  containingFile: string
): Effect.Effect<string, TypeScriptServiceError> =>
  Effect.try({
    try: () => {
      const resolved = ts.resolveModuleName(
        modulePath,
        containingFile,
        program.getCompilerOptions(),
        ts.sys
      )

      const resolvedFile = resolved.resolvedModule?.resolvedFileName
      if (resolvedFile && resolvedFile.length > 0) {
        return resolvedFile
      }

      throw new Error("module-not-found")
    },
    catch: () => makeModuleNotFoundError(modulePath)
  })

export const createResolveModulePathEffect = (
  program: ts.Program | undefined
) =>
(
  modulePath: string,
  containingFile: string
): Effect.Effect<string, TypeScriptServiceError> =>
  program
    ? resolveModuleNameEffect(program, modulePath, containingFile)
    : Effect.fail(makeTypeCheckerUnavailableError())

const findExportSymbol = (
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
  exportName: string
): ts.Symbol | undefined =>
  checker
    .getExportsOfModule(moduleSymbol)
    .find((symbol) => symbol.getName() === exportName)

const createTypeResolutionEffect = (
  resolve: () => string | undefined,
  errorLabel: string
): Effect.Effect<string | undefined, TypeScriptServiceError> =>
  Effect.try({
    try: resolve,
    catch: (error) =>
      makeTypeResolutionError(
        error instanceof Error ? error.message : errorLabel
      )
  })

const getExportSignatureEffect = (
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
  exportName: string,
  contextFile: ts.SourceFile
): Effect.Effect<string | undefined, TypeScriptServiceError> =>
  createTypeResolutionEffect(() => {
    const targetSymbol = findExportSymbol(checker, moduleSymbol, exportName)
    if (!targetSymbol) return

    const symbolType = checker.getTypeOfSymbolAtLocation(
      targetSymbol,
      contextFile
    )

    return formatTypeSignature(checker, symbolType)
  }, "export-signature-error")

export const createGetExportTypeSignatureEffect = (
  checker: ts.TypeChecker | undefined,
  program: ts.Program | undefined
) => {
  interface ExportLookupParams extends ModuleLookupParams {
    readonly exportName: string
  }

  const lookup = createModuleLookupEffect<string, ExportLookupParams>(
    checker,
    program,
    (availableChecker, moduleSymbol, contextFile, params) =>
      getExportSignatureEffect(
        availableChecker,
        moduleSymbol,
        params.exportName,
        contextFile
      )
  )

  return (
    modulePath: string,
    exportName: string,
    containingFilePath?: string
  ): Effect.Effect<string | undefined, TypeScriptServiceError> => {
    const params = containingFilePath
      ? { modulePath, exportName, containingFilePath }
      : { modulePath, exportName }
    return lookup(params)
  }
}

const getModuleTypeNameEffect = (
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
  contextFile: ts.SourceFile
): Effect.Effect<string | undefined, TypeScriptServiceError> =>
  createTypeResolutionEffect(() => {
    const moduleType = checker.getTypeOfSymbolAtLocation(
      moduleSymbol,
      contextFile
    )
    return formatTypeName(checker, moduleType, contextFile)
  }, "module-type-error")

export const createGetModuleTypeNameEffect = (
  checker: ts.TypeChecker | undefined,
  program: ts.Program | undefined
) => {
  const lookup = createModuleLookupEffect<string, ModuleLookupParams>(
    checker,
    program,
    (availableChecker, moduleSymbol, contextFile) =>
      getModuleTypeNameEffect(availableChecker, moduleSymbol, contextFile)
  )

  return (
    modulePath: string,
    containingFilePath?: string
  ): Effect.Effect<string | undefined, TypeScriptServiceError> => {
    const params = containingFilePath
      ? { modulePath, containingFilePath }
      : { modulePath }
    return lookup(params)
  }
}
