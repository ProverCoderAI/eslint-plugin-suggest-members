import { describe, expect, it } from "vitest"

import {
  findSimilarCandidates,
  makeSimilarityScore,
  MAX_SUGGESTIONS,
  MIN_SIMILARITY_SCORE
} from "../../src/core/index.js"

describe("core suggestion engine", () => {
  it("returns sorted suggestions within bounds", () => {
    const candidates = ["useState", "useEffect", "useMemo", "useCallback"]
    const suggestions = findSimilarCandidates("useStae", candidates)

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS)

    let previousScore: number | undefined
    for (const suggestion of suggestions) {
      expect(suggestion.score).toBeGreaterThanOrEqual(MIN_SIMILARITY_SCORE)
      expect(suggestion.score).toBeLessThanOrEqual(makeSimilarityScore(1))

      if (previousScore !== undefined) {
        expect(previousScore).toBeGreaterThanOrEqual(suggestion.score)
      }
      previousScore = suggestion.score
    }
  })

  it("clamps similarity scores", () => {
    const score = makeSimilarityScore(1.2)
    expect(score).toBeLessThanOrEqual(makeSimilarityScore(1))
  })
})
