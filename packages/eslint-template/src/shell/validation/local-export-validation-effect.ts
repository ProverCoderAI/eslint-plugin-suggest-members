// CHANGE: local export validation (Effect)
// WHY: re-export shared validator for local export identifiers
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: export-only module
// COMPLEXITY: O(1)/O(1)
export { formatLocalExportValidationMessage, validateLocalExportIdentifierEffect } from "./missing-name-validators.js"
