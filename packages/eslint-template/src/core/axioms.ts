// CHANGE: centralize axiomatic casts (brands + plugin bridge)
// WHY: allow limited, auditable use of `as` in one module
// QUOTE(TZ): n/a
// REF: AGENTS.md axiomatic module rule
// SOURCE: n/a
// FORMAT THEOREM: ∀x ∈ ℝ: clamp(x) ∈ [0,1]
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: SimilarityScore ∈ [0,1]
// COMPLEXITY: O(1)/O(1)
import type { TSESLint } from "@typescript-eslint/utils"
import type { ESLint } from "eslint"

import type { SimilarityScore } from "./types/domain.js"

export const makeSimilarityScore = (value: number): SimilarityScore => {
  const clamped = value < 0 ? 0 : (Math.min(value, 1))
  return clamped as SimilarityScore
}

export const toEslintPlugin = (
  plugin: TSESLint.FlatConfig.Plugin
): ESLint.Plugin => plugin as never as ESLint.Plugin
