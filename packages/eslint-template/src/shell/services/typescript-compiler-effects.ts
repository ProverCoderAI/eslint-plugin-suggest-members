// CHANGE: TypeScript compiler effects (node/type operations)
// WHY: typed Effect wrappers for compiler API
// QUOTE(TZ): n/a
// REF: AGENTS.md typed errors
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<T, TypeScriptServiceError>
// INVARIANT: checker must exist
// COMPLEXITY: O(1)/O(n)
import { Effect } from "effect"
import type * as ts from "typescript"

import type { TypeScriptServiceError } from "../effects/errors.js"
import { makeSymbolNotFoundError, makeTypeNotFoundError, makeTypeResolutionError } from "../effects/errors.js"
import { createTypeScriptEffect } from "./typescript-effect-utils.js"

export const createGetSymbolAtLocationEffect = (
  checker: ts.TypeChecker | undefined
) =>
(node: ts.Node): Effect.Effect<ts.Symbol, TypeScriptServiceError> =>
  createTypeScriptEffect(checker, (availableChecker) =>
    Effect.try({
      try: () => {
        const symbol = availableChecker.getSymbolAtLocation(node)
        if (!symbol) {
          throw new Error("symbol-not-found")
        }
        return symbol
      },
      catch: () => makeSymbolNotFoundError("symbol-not-found")
    }))

export const createGetTypeAtLocationEffect = (
  checker: ts.TypeChecker | undefined
) =>
(node: ts.Node): Effect.Effect<ts.Type, TypeScriptServiceError> =>
  createTypeScriptEffect(checker, (availableChecker) =>
    Effect.try({
      try: () => availableChecker.getTypeAtLocation(node),
      catch: () => makeTypeNotFoundError("type-not-found")
    }))

export const createGetPropertiesOfTypeEffect = (
  checker: ts.TypeChecker | undefined
) =>
(type: ts.Type): Effect.Effect<ReadonlyArray<ts.Symbol>, TypeScriptServiceError> =>
  createTypeScriptEffect(checker, (availableChecker) =>
    Effect.try({
      try: () => availableChecker.getPropertiesOfType(type),
      catch: (error) =>
        makeTypeResolutionError(
          error instanceof Error ? error.message : "type-resolution-error"
        )
    }))

export const createGetSymbolsInScopeEffect = (
  checker: ts.TypeChecker | undefined
) =>
(
  node: ts.Node,
  flags: ts.SymbolFlags
): Effect.Effect<ReadonlyArray<ts.Symbol>, TypeScriptServiceError> =>
  createTypeScriptEffect(checker, (availableChecker) =>
    Effect.try({
      try: () => availableChecker.getSymbolsInScope(node, flags),
      catch: (error) =>
        makeTypeResolutionError(
          error instanceof Error ? error.message : "symbols-in-scope-error"
        )
    }))
