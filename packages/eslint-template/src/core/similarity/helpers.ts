// CHANGE: similarity helper functions
// WHY: pure string normalization + tokenization
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// FORMAT THEOREM: splitIdentifier: String -> Token[]
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: tokens are lowercase and non-empty
// COMPLEXITY: O(n)/O(1)

export const splitIdentifier = (identifier: string): ReadonlyArray<string> =>
  identifier
    .split(/(?=[A-Z])|[_\s\d]/)
    .map((s) => s.toLowerCase())
    .filter((s) => s.length > 0)

export const normalize = (value: string): string => value.toLowerCase().replaceAll(/[_\s./-]/g, "")

export const longestCommonPrefix = (a: string, b: string): number => {
  const max = Math.min(a.length, b.length)
  let i = 0
  while (i < max && a[i] === b[i]) {
    i += 1
  }
  return i
}

export const hasSubstringMatch = (a: string, b: string): boolean => {
  const normA = normalize(a)
  const normB = normalize(b)
  if (normA.length === 0 || normB.length === 0) return false
  return normA.includes(normB) || normB.includes(normA)
}
