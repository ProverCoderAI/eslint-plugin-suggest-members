// CHANGE: ESLint rule suggest-imports
// WHY: suggest similar exports for invalid imports
// QUOTE(TZ): n/a
// REF: AGENTS.md RULES
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: ESLint reporting + TS service
// INVARIANT: only reports when suggestions exist
// COMPLEXITY: O(n log n)/O(n)
import { createValidationRule } from "../../shell/shared/import-validation-rule-factory.js"
import {
  formatImportValidationMessage,
  validateImportSpecifierEffect
} from "../../shell/validation/import-validation-effect.js"

export const suggestImportsRule = createValidationRule(
  "suggest-imports",
  "Suggest similar export names when importing non-existent members",
  "suggestImports",
  {
    validateSpecifier: validateImportSpecifierEffect,
    formatMessage: formatImportValidationMessage,
    messageId: "suggestImports"
  }
)
