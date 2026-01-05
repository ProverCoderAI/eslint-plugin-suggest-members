// CHANGE: shared suggestion signature enrichment
// WHY: reuse signature enrichment across validators
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect
// INVARIANT: preserves order and scores
// COMPLEXITY: O(n)/O(n)
import { Effect } from "effect"

import type * as ts from "typescript"
import type { SuggestionWithScore } from "../../core/types/domain.js"
import type { TypeScriptServiceError } from "../effects/errors.js"

export const enrichSuggestionsWithSignaturesEffect = (
  suggestions: ReadonlyArray<SuggestionWithScore>,
  resolveSignature: (
    name: string
  ) => Effect.Effect<string | undefined, TypeScriptServiceError>
): Effect.Effect<ReadonlyArray<SuggestionWithScore>, TypeScriptServiceError> =>
  Effect.all(
    suggestions.map((suggestion) =>
      Effect.gen(function*(_) {
        const signature = yield* _(resolveSignature(suggestion.name))
        if (!signature || signature.length === 0) return suggestion

        return {
          name: suggestion.name,
          score: suggestion.score,
          signature
        }
      })
    ),
    { concurrency: "unbounded" }
  )

type SymbolSignatureResolver = (
  symbol: ts.Symbol,
  node?: ts.Node
) => Effect.Effect<string | undefined, TypeScriptServiceError>

export const createSymbolSignatureResolver = (
  symbols: ReadonlyMap<string, ts.Symbol>,
  tsNode: ts.Node | undefined,
  getSymbolTypeSignature: SymbolSignatureResolver
) =>
(name: string): Effect.Effect<string | undefined, TypeScriptServiceError> => {
  const symbol = symbols.get(name)
  if (!symbol) return Effect.sync((): string | undefined => undefined)
  return getSymbolTypeSignature(symbol, tsNode)
}

export const enrichSuggestionsWithSymbolMapEffect = (
  suggestions: ReadonlyArray<SuggestionWithScore>,
  symbols: ReadonlyMap<string, ts.Symbol>,
  tsNode: ts.Node | undefined,
  getSymbolTypeSignature: SymbolSignatureResolver
): Effect.Effect<ReadonlyArray<SuggestionWithScore>, TypeScriptServiceError> =>
  enrichSuggestionsWithSignaturesEffect(
    suggestions,
    createSymbolSignatureResolver(symbols, tsNode, getSymbolTypeSignature)
  )
