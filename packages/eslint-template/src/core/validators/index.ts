// CHANGE: validator exports
// WHY: single entry for CORE predicates
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// PURITY: CORE
export {
  extractModuleName,
  extractPropertyName,
  isModulePath,
  isTypeOnlyImport,
  shouldSkipIdentifier,
  shouldSkipMemberExpression
} from "./node-predicates.js"
