// CHANGE: shared TypeScript effect utilities
// WHY: reusable Effect wrappers for compiler operations
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect composition
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<T, TypeScriptServiceError>
// INVARIANT: checker must exist to run operation
// COMPLEXITY: O(1)/O(1)
import { Effect, pipe } from "effect"
import * as ts from "typescript"

import type { TypeScriptServiceError } from "../effects/errors.js"
import { makeTypeCheckerUnavailableError, makeTypeResolutionError } from "../effects/errors.js"

export const createTypeScriptEffect = <T>(
  checker: ts.TypeChecker | undefined,
  operation: (checker: ts.TypeChecker) => Effect.Effect<T, TypeScriptServiceError>
): Effect.Effect<T, TypeScriptServiceError> =>
  pipe(
    Effect.sync(() => checker ? operation(checker) : Effect.fail(makeTypeCheckerUnavailableError())),
    Effect.flatten
  )

export const createUndefinedResultEffect = <T>() => (): Effect.Effect<T | undefined, TypeScriptServiceError> =>
  Effect.sync((): T | undefined => undefined)

const findSymbolNode = (symbol: ts.Symbol): ts.Declaration | undefined =>
  [symbol.valueDeclaration, ...(symbol.declarations ?? [])].find(
    (node): node is ts.Declaration => node !== undefined
  )

export const formatTypeSignature = (
  checker: ts.TypeChecker,
  symbolType: ts.Type,
  locationNode?: ts.Node
): string =>
  checker.typeToString(
    symbolType,
    locationNode,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
  )

export const formatTypeName = (
  checker: ts.TypeChecker,
  type: ts.Type,
  locationNode?: ts.Node
): string =>
  checker.typeToString(
    type,
    locationNode,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.UseFullyQualifiedType |
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
  )

const preferImportedTypeName = (primary: string, fallback: string): string =>
  fallback.includes("import(") ? fallback : primary

export const createGetTypeNameEffect = (
  checker: ts.TypeChecker | undefined
) =>
(
  type: ts.Type,
  location?: ts.Node
): Effect.Effect<string, TypeScriptServiceError> =>
  createTypeScriptEffect(checker, (availableChecker) =>
    Effect.try({
      try: () => {
        const primary = formatTypeName(availableChecker, type, location)
        const fallback = formatTypeName(availableChecker, type)
        return preferImportedTypeName(primary, fallback)
      },
      catch: (error) =>
        makeTypeResolutionError(
          error instanceof Error ? error.message : "type-name-error"
        )
    }))

const buildSymbolSignature = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  fallbackNode?: ts.Node
): Effect.Effect<string | undefined, TypeScriptServiceError> =>
  pipe(
    Effect.sync(() => findSymbolNode(symbol) ?? fallbackNode),
    Effect.flatMap((locationNode) =>
      locationNode
        ? Effect.try({
          try: () => {
            const symbolType = checker.getTypeOfSymbolAtLocation(
              symbol,
              locationNode
            )

            return formatTypeSignature(checker, symbolType, locationNode)
          },
          catch: (error) =>
            makeTypeResolutionError(
              error instanceof Error ? error.message : "symbol-signature-error"
            )
        })
        : Effect.sync((): string | undefined => undefined)
    )
  )

export const createGetSymbolTypeSignatureEffect = (
  checker: ts.TypeChecker | undefined
): (
  symbol: ts.Symbol,
  fallbackNode?: ts.Node
) => Effect.Effect<string | undefined, TypeScriptServiceError> => {
  if (!checker) {
    return createUndefinedResultEffect<string>()
  }

  return (
    symbol: ts.Symbol,
    fallbackNode?: ts.Node
  ): Effect.Effect<string | undefined, TypeScriptServiceError> =>
    createTypeScriptEffect(checker, (availableChecker) => buildSymbolSignature(availableChecker, symbol, fallbackNode))
}
