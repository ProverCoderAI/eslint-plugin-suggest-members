// CHANGE: Jaro-Winkler similarity (pure)
// WHY: boost prefix similarity
// QUOTE(TZ): n/a
// REF: Winkler, 1990
// SOURCE: n/a
// FORMAT THEOREM: jw = jaro + p*l*(1-jaro)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: jw ∈ [0,1]
// COMPLEXITY: O(n·m)/O(n+m)
import { makeSimilarityScore } from "../axioms.js"
import type { SimilarityScore } from "../types/domain.js"
import { longestCommonPrefix, normalize } from "./helpers.js"
import { jaro } from "./jaro.js"

export const jaroWinkler = (left: string, right: string): SimilarityScore => {
  const jaroScore = jaro(left, right)
  const prefixLength = longestCommonPrefix(normalize(left), normalize(right))
  const maxPrefix = 4
  const prefixScale = 0.1
  const boundedPrefix = Math.min(prefixLength, maxPrefix)

  const score = jaroScore + boundedPrefix * prefixScale * (1 - jaroScore)
  return makeSimilarityScore(score)
}
