// CHANGE: shared import/export validation base
// WHY: eliminate duplication between suggest-imports and suggest-exports
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect-based validation
// INVARIANT: validation is deterministic for given inputs
// COMPLEXITY: O(1)/O(n)
import type { TSESTree } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint"
import type { Layer } from "effect"
import { Effect, Exit } from "effect"

import type { TypeScriptServiceError } from "../effects/errors.js"
import type { FilesystemService } from "../services/filesystem.js"
import type { TypeScriptCompilerServiceTag } from "../services/typescript-compiler.js"
import { makeTypeScriptCompilerServiceLayer } from "../services/typescript-compiler.js"
import { isValidImportIdentifier, tryValidationWithFallback } from "./validation-helpers.js"

export type ModuleSpecifier = TSESTree.ImportSpecifier | TSESTree.ExportSpecifier

export interface TypeScriptServiceLayerContext {
  readonly layer: Layer.Layer<TypeScriptCompilerServiceTag>
  readonly hasTypeScript: boolean
}

export interface ImportValidationConfig<TResult> {
  readonly validateSpecifier: (
    specifier: ModuleSpecifier,
    importName: string,
    modulePath: string,
    containingFilePath: string
  ) => Effect.Effect<TResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
  readonly fallbackValidationEffect?: (
    filesystemService: FilesystemService
  ) => (
    importName: string,
    modulePath: string,
    contextFilePath: string
  ) => Effect.Effect<TResult>
  readonly formatMessage: (result: TResult) => string
  readonly messageId: string
  readonly skipWhenTypeScriptAvailable?: boolean
}

interface ValidateModuleSpecifierParams<TResult> {
  readonly importedNode: TSESTree.Node | undefined
  readonly specifier: ModuleSpecifier
  readonly modulePath: string
  readonly config: ImportValidationConfig<TResult>
  readonly context: RuleContext<string, ReadonlyArray<string>>
  readonly tsService: TypeScriptServiceLayerContext
}

const validateModuleSpecifier = <TResult>({
  config,
  context,
  importedNode,
  modulePath,
  specifier,
  tsService
}: ValidateModuleSpecifierParams<TResult>): void => {
  if (!importedNode) return
  if (!isValidImportIdentifier(importedNode)) return

  const imported = importedNode

  executeImportValidation({
    imported,
    specifier,
    modulePath,
    config,
    context,
    containingFilePath: context.filename || "",
    tsService
  })
}

const makeSpecifierValidator = <TSpecifier extends ModuleSpecifier>(
  getImportedNode: (specifier: TSpecifier) => TSESTree.Node | undefined
) =>
<TResult>(
  specifier: TSpecifier,
  modulePath: string,
  config: ImportValidationConfig<TResult>,
  context: RuleContext<string, ReadonlyArray<string>>,
  tsService: TypeScriptServiceLayerContext
): void => {
  validateModuleSpecifier({
    importedNode: getImportedNode(specifier),
    specifier,
    modulePath,
    config,
    context,
    tsService
  })
}

export const validateImportSpecifierBase = makeSpecifierValidator<
  TSESTree.ImportSpecifier
>((specifier) => specifier.imported)

export const validateExportSpecifierBase = makeSpecifierValidator<
  TSESTree.ExportSpecifier
>((specifier) => specifier.local)

const executeImportValidation = <TResult>(params: {
  readonly imported: TSESTree.Identifier
  readonly specifier: ModuleSpecifier
  readonly modulePath: string
  readonly config: ImportValidationConfig<TResult>
  readonly context: RuleContext<string, ReadonlyArray<string>>
  readonly containingFilePath: string
  readonly tsService: TypeScriptServiceLayerContext
}): void => {
  const { config, containingFilePath, context, imported, modulePath, specifier, tsService } = params
  const importName = imported.name

  if (config.skipWhenTypeScriptAvailable === true && tsService.hasTypeScript) {
    return
  }

  const validationEffect = Effect.provide(
    config.validateSpecifier(specifier, importName, modulePath, containingFilePath),
    tsService.layer
  )

  tryValidationWithFallback({
    imported,
    importName,
    modulePath,
    config,
    context,
    validationEffect
  })
}

const emptyTypeScriptLayer = makeTypeScriptCompilerServiceLayer()

export const createTypeScriptServiceLayerForContext = (
  context: RuleContext<string, ReadonlyArray<string>>
): TypeScriptServiceLayerContext => {
  const parseResult = getParserServicesForContext(context)

  if (!parseResult) {
    return {
      layer: emptyTypeScriptLayer,
      hasTypeScript: false
    }
  }

  const program = parseResult.program
  if (!program) {
    return {
      layer: emptyTypeScriptLayer,
      hasTypeScript: false
    }
  }
  const checker = program.getTypeChecker()

  return {
    layer: makeTypeScriptCompilerServiceLayer(checker, program),
    hasTypeScript: true
  }
}

export const getParserServicesForContext = (
  context: RuleContext<string, ReadonlyArray<string>>
): ReturnType<typeof ESLintUtils.getParserServices> | null =>
  Exit.match(
    Effect.runSyncExit(
      Effect.try({
        try: () => ESLintUtils.getParserServices(context, false),
        catch: () => null
      })
    ),
    {
      onFailure: () => null,
      onSuccess: (value) => value
    }
  )
