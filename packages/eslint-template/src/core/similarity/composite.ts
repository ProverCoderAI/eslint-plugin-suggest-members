// CHANGE: composite similarity score
// WHY: combine multiple metrics
// QUOTE(TZ): n/a
// REF: internal similarity formula
// SOURCE: n/a
// FORMAT THEOREM: score = clamp(0.5*jw + 0.3*jaccard + 0.1*contain + 0.1*prefix - penalty)
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: score ∈ [0,1]
// COMPLEXITY: O(n·m)/O(n)
import { makeSimilarityScore } from "../axioms.js"
import type { SimilarityScore } from "../types/domain.js"
import { hasSubstringMatch, longestCommonPrefix, normalize, splitIdentifier } from "./helpers.js"
import { jaroWinkler } from "./jaro-winkler.js"

export const jaccardSimilarity = (left: string, right: string): SimilarityScore => {
  const leftTokens = splitIdentifier(left)
  const rightTokens = splitIdentifier(right)

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return makeSimilarityScore(0)
  }

  const leftSet = new Set(leftTokens)
  const rightSet = new Set(rightTokens)

  let intersection = 0
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1
    }
  }

  const union = leftSet.size + rightSet.size - intersection
  if (union === 0) return makeSimilarityScore(0)

  return makeSimilarityScore(intersection / union)
}

export const containmentScore = (left: string, right: string): SimilarityScore =>
  makeSimilarityScore(hasSubstringMatch(left, right) ? 1 : 0)

export const prefixScore = (left: string, right: string): SimilarityScore => {
  const maxPrefix = 4
  const commonPrefix = longestCommonPrefix(normalize(left), normalize(right))
  const bounded = Math.min(maxPrefix, commonPrefix)
  return makeSimilarityScore(bounded / maxPrefix)
}

export const lengthPenalty = (userInput: string, candidate: string): number => {
  const maxPenalty = 0.15
  const penaltyPerChar = 0.01
  const lengthDiff = Math.max(0, candidate.length - userInput.length)
  return Math.min(maxPenalty, lengthDiff * penaltyPerChar)
}

export const compositeScore = (
  userInput: string,
  candidate: string
): SimilarityScore => {
  const jw = jaroWinkler(userInput, candidate)
  const jaccard = jaccardSimilarity(userInput, candidate)
  const contain = containmentScore(userInput, candidate)
  const prefix = prefixScore(userInput, candidate)
  const penalty = lengthPenalty(userInput, candidate)

  const score = 0.5 * jw + 0.3 * jaccard + 0.1 * contain + 0.1 * prefix - penalty
  return makeSimilarityScore(score)
}
