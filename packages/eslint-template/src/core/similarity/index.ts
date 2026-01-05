// CHANGE: similarity module exports
// WHY: single entry for similarity algorithms
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// PURITY: CORE
export { compositeScore, containmentScore, jaccardSimilarity, lengthPenalty, prefixScore } from "./composite.js"
export { hasSubstringMatch, longestCommonPrefix, normalize, splitIdentifier } from "./helpers.js"
export { jaroWinkler } from "./jaro-winkler.js"
export { jaro } from "./jaro.js"
