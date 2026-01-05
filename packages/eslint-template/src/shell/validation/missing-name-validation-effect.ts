// CHANGE: missing name validation (Effect)
// WHY: re-export shared validator for unresolved names
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: export-only module
// COMPLEXITY: O(1)/O(1)
export { formatMissingNameValidationMessage, validateMissingNameIdentifierEffect } from "./missing-name-validators.js"
