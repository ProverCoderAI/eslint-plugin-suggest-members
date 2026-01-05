// CHANGE: TypeScript compiler service (Effect + Layer)
// WHY: typed dependency injection for compiler operations
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect Layer
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<Success, Error, Requirements>
// INVARIANT: service ops are total over errors
// COMPLEXITY: O(1)/O(n)
import type { Effect } from "effect"
import { Context, Layer } from "effect"
import type * as ts from "typescript"

import type { TypeScriptServiceError } from "../effects/errors.js"
import {
  createGetPropertiesOfTypeEffect,
  createGetSymbolAtLocationEffect,
  createGetSymbolsInScopeEffect,
  createGetTypeAtLocationEffect
} from "./typescript-compiler-effects.js"
import {
  createGetExportsOfModuleEffect,
  createGetExportTypeSignatureEffect,
  createGetModuleTypeNameEffect,
  createResolveModulePathEffect
} from "./typescript-compiler-module-effects.js"
import { createGetSymbolTypeSignatureEffect, createGetTypeNameEffect } from "./typescript-effect-utils.js"

export interface TypeScriptCompilerService {
  readonly getSymbolAtLocation: (
    node: ts.Node
  ) => Effect.Effect<ts.Symbol, TypeScriptServiceError>

  readonly getSymbolsInScope: (
    node: ts.Node,
    flags: ts.SymbolFlags
  ) => Effect.Effect<ReadonlyArray<ts.Symbol>, TypeScriptServiceError>

  readonly getTypeAtLocation: (
    node: ts.Node
  ) => Effect.Effect<ts.Type, TypeScriptServiceError>

  readonly getTypeName: (
    type: ts.Type,
    location?: ts.Node
  ) => Effect.Effect<string, TypeScriptServiceError>

  readonly getPropertiesOfType: (
    type: ts.Type
  ) => Effect.Effect<ReadonlyArray<ts.Symbol>, TypeScriptServiceError>

  readonly getExportsOfModule: (
    modulePath: string,
    containingFilePath?: string
  ) => Effect.Effect<ReadonlyArray<string>, TypeScriptServiceError>

  readonly getModuleTypeName: (
    modulePath: string,
    containingFilePath?: string
  ) => Effect.Effect<string | undefined, TypeScriptServiceError>

  readonly resolveModulePath: (
    modulePath: string,
    containingFile: string
  ) => Effect.Effect<string, TypeScriptServiceError>

  readonly getExportTypeSignature: (
    modulePath: string,
    exportName: string,
    containingFilePath?: string
  ) => Effect.Effect<string | undefined, TypeScriptServiceError>

  readonly getSymbolTypeSignature: (
    symbol: ts.Symbol,
    location?: ts.Node
  ) => Effect.Effect<string | undefined, TypeScriptServiceError>
}

export class TypeScriptCompilerServiceTag extends Context.Tag(
  "TypeScriptCompilerService"
)<TypeScriptCompilerServiceTag, TypeScriptCompilerService>() {}

export const makeTypeScriptCompilerService = (
  checker: ts.TypeChecker | undefined,
  program: ts.Program | undefined
): TypeScriptCompilerService => ({
  getSymbolAtLocation: createGetSymbolAtLocationEffect(checker),
  getSymbolsInScope: createGetSymbolsInScopeEffect(checker),
  getTypeAtLocation: createGetTypeAtLocationEffect(checker),
  getTypeName: createGetTypeNameEffect(checker),
  getPropertiesOfType: createGetPropertiesOfTypeEffect(checker),
  getExportsOfModule: createGetExportsOfModuleEffect(checker, program),
  getModuleTypeName: createGetModuleTypeNameEffect(checker, program),
  resolveModulePath: createResolveModulePathEffect(program),
  getExportTypeSignature: createGetExportTypeSignatureEffect(checker, program),
  getSymbolTypeSignature: createGetSymbolTypeSignatureEffect(checker)
})

export const makeTypeScriptCompilerServiceLayer = (
  checker?: ts.TypeChecker,
  program?: ts.Program
): Layer.Layer<TypeScriptCompilerServiceTag> =>
  Layer.succeed(
    TypeScriptCompilerServiceTag,
    makeTypeScriptCompilerService(checker, program)
  )
