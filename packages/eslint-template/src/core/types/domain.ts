// CHANGE: domain types for similarity + suggestions
// WHY: enforce mathematical invariants via branding
// QUOTE(TZ): n/a
// REF: AGENTS.md type safety
// SOURCE: n/a
// FORMAT THEOREM: SimilarityScore ∈ [0,1]
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: score ∈ [0,1]
// COMPLEXITY: O(1)/O(1)
import { makeSimilarityScore } from "../axioms.js"

export type SimilarityScore = number & { readonly __brand: "SimilarityScore" }

export type NormalizedString = string & {
  readonly __brand: "NormalizedString"
}

export type Token = string & { readonly __brand: "Token" }

export interface SuggestionWithScore {
  readonly name: string
  readonly score: SimilarityScore
  readonly signature?: string
}

export const MIN_SIMILARITY_SCORE: SimilarityScore = makeSimilarityScore(0.34)
export const MAX_SUGGESTIONS = 5
