// CHANGE: rules registry
// WHY: central rule map for plugin
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE
// SOURCE: n/a
// PURITY: CORE
import { suggestExportsRule } from "./suggest-exports/index.js"
import { suggestImportsRule } from "./suggest-imports/index.js"
import { suggestMembersRule } from "./suggest-members/index.js"
import { suggestMissingNamesRule } from "./suggest-missing-names/index.js"
import { suggestModulePathsRule } from "./suggest-module-paths/index.js"

export const rules = {
  "suggest-exports": suggestExportsRule,
  "suggest-imports": suggestImportsRule,
  "suggest-members": suggestMembersRule,
  "suggest-missing-names": suggestMissingNamesRule,
  "suggest-module-paths": suggestModulePathsRule
}

export { suggestExportsRule } from "./suggest-exports/index.js"
export { suggestImportsRule } from "./suggest-imports/index.js"
export { suggestMembersRule } from "./suggest-members/index.js"
export { suggestMissingNamesRule } from "./suggest-missing-names/index.js"
export { suggestModulePathsRule } from "./suggest-module-paths/index.js"
