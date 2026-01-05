// CHANGE: suggestion engine
// WHY: rank candidates by similarity
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// FORMAT THEOREM: result sorted by descending score
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: length ≤ MAX_SUGGESTIONS
// COMPLEXITY: O(n^2)/O(n)
import { compositeScore } from "../similarity/index.js"
import type { SuggestionWithScore } from "../types/domain.js"
import { MAX_SUGGESTIONS, MIN_SIMILARITY_SCORE } from "../types/domain.js"

export const findSimilarCandidates = (
  userInput: string,
  candidates: ReadonlyArray<string>
): ReadonlyArray<SuggestionWithScore> => {
  const scored = candidates.map((name) => ({
    name,
    score: compositeScore(userInput, name)
  }))

  const filtered = scored.filter((item) => item.score >= MIN_SIMILARITY_SCORE)
  let sorted: ReadonlyArray<SuggestionWithScore> = []
  for (const item of filtered) {
    let index = 0
    while (index < sorted.length && (sorted[index]?.score ?? item.score) >= item.score) {
      index += 1
    }
    sorted = [...sorted.slice(0, index), item, ...sorted.slice(index)]
  }

  return sorted.slice(0, MAX_SUGGESTIONS)
}
