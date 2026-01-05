// CHANGE: candidate validation utilities
// WHY: pure filtering rules
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// FORMAT THEOREM: isValidCandidate(c,t) -> boolean
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: candidate length > 0
// COMPLEXITY: O(1)/O(1)

export const SUPPORTED_EXTENSIONS: ReadonlyArray<string> = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".d.ts"
]

export const isValidCandidate = (candidate: string, target?: string): boolean => {
  if (candidate.length === 0) return false
  if (candidate.startsWith("__")) return false
  if (candidate.startsWith("_")) return false
  if (target !== undefined && candidate === target) return false
  return true
}

export const getMinimumSimilarityScore = (): number => 0.34
