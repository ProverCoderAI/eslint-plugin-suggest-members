// CHANGE: Jaro similarity (pure)
// WHY: core string distance metric
// QUOTE(TZ): n/a
// REF: Jaro, 1989
// SOURCE: n/a
// FORMAT THEOREM: jaro: String × String -> [0,1]
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: reflexive, symmetric, bounded
// COMPLEXITY: O(n·m)/O(n+m)
import { makeSimilarityScore } from "../axioms.js"
import type { SimilarityScore } from "../types/domain.js"

const segmentString = (value: string): ReadonlyArray<string> => {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
  return Array.from(segmenter.segment(value), (segment) => segment.segment)
}

const findMatches = (
  left: string,
  right: string,
  matchDistance: number
): { matches: number; leftMatches: Array<boolean>; rightMatches: Array<boolean> } => {
  const leftChars = segmentString(left)
  const leftMatches = Array.from({ length: left.length }, () => false)
  const rightMatches = Array.from({ length: right.length }, () => false)
  let matches = 0

  for (const [i, element] of leftChars.entries()) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, right.length)

    for (let j = start; j < end; j += 1) {
      if (rightMatches[j] === true) continue
      if (element !== right[j]) continue

      leftMatches[i] = true
      rightMatches[j] = true
      matches += 1
      break
    }
  }

  return { matches, leftMatches, rightMatches }
}

const countTranspositions = (
  left: string,
  right: string,
  leftMatches: Array<boolean>,
  rightMatches: Array<boolean>
): number => {
  const leftChars = segmentString(left)
  let transpositions = 0
  let rightIndex = 0

  for (const [i, element] of leftChars.entries()) {
    if (leftMatches[i] !== true) continue

    while (rightMatches[rightIndex] !== true) {
      rightIndex += 1
    }

    if (element !== right[rightIndex]) {
      transpositions += 1
    }
    rightIndex += 1
  }

  return transpositions
}

export const jaro = (left: string, right: string): SimilarityScore => {
  if (left === right) return makeSimilarityScore(1)
  if (left.length === 0 || right.length === 0) return makeSimilarityScore(0)

  const matchDistance = Math.floor(Math.max(left.length, right.length) / 2) - 1
  const { leftMatches, matches, rightMatches } = findMatches(
    left,
    right,
    matchDistance
  )

  if (matches === 0) return makeSimilarityScore(0)

  const transpositions = countTranspositions(
    left,
    right,
    leftMatches,
    rightMatches
  )

  const result = (matches / left.length +
    matches / right.length +
    (matches - transpositions / 2) / matches) /
    3

  return makeSimilarityScore(result)
}
