// CHANGE: CORE public API
// WHY: single entry point for pure logic
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// PURITY: CORE
export { findSimilarCandidatesEffect, formatSuggestionMessageEffect, isValidCandidateEffect } from "./effects/index.js"

export {
  formatExportMessage,
  formatImportMessage,
  formatMemberMessage,
  formatMissingNameMessage,
  formatModuleMessage,
  formatSuggestionMessage
} from "./formatting/messages.js"

export {
  compositeScore,
  containmentScore,
  hasSubstringMatch,
  jaccardSimilarity,
  jaro,
  jaroWinkler,
  lengthPenalty,
  longestCommonPrefix,
  normalize,
  prefixScore,
  splitIdentifier
} from "./similarity/index.js"

export { makeSimilarityScore } from "./axioms.js"

export { findSimilarCandidates } from "./suggestion/engine.js"

export type { NormalizedString, SimilarityScore, SuggestionWithScore, Token } from "./types/domain.js"

export { MAX_SUGGESTIONS, MIN_SIMILARITY_SCORE } from "./types/domain.js"

export type {
  ExportValidationResult,
  ImportValidationResult,
  MemberValidationResult,
  MissingNameValidationResult,
  ModulePathValidationResult
} from "./types/validation.js"

export {
  makeExportNotFoundResult,
  makeImportNotFoundResult,
  makeInvalidMemberResult,
  makeMissingNameResult,
  makeModuleNotFoundResult,
  makeValidExportResult,
  makeValidImportResult,
  makeValidMemberResult,
  makeValidMissingNameResult,
  makeValidModuleResult,
  makeValidResult
} from "./types/validation.js"

export { getMinimumSimilarityScore, isValidCandidate, SUPPORTED_EXTENSIONS } from "./validation/candidates.js"

export {
  extractModuleName,
  extractPropertyName,
  isModulePath,
  isTypeOnlyImport,
  shouldSkipIdentifier,
  shouldSkipMemberExpression
} from "./validators/index.js"
