// CHANGE: plugin entrypoint
// WHY: export rules + recommended config
// QUOTE(TZ): n/a
// REF: AGENTS.md plugin composition
// SOURCE: n/a
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: rules map contains all rule names
// COMPLEXITY: O(1)/O(1)
import type { TSESLint } from "@typescript-eslint/utils"
import type { Linter } from "eslint"

import { toEslintPlugin } from "./core/axioms.js"
import { name, version } from "./core/plugin-meta.js"
import { rules } from "./rules/index.js"

type PluginConfig = Linter.Config

type PluginBase = Omit<TSESLint.FlatConfig.Plugin, "configs">

type PluginWithConfigs = PluginBase & {
  readonly configs: {
    readonly recommended: PluginConfig
  }
}

const pluginBase: PluginBase = {
  meta: { name, version },
  rules
}

const recommended: PluginConfig = {
  plugins: {
    "suggest-members": toEslintPlugin(pluginBase)
  },
  rules: {
    "suggest-members/suggest-exports": "error",
    "suggest-members/suggest-imports": "error",
    "suggest-members/suggest-members": "error",
    "suggest-members/suggest-missing-names": "error",
    "suggest-members/suggest-module-paths": "error"
  }
}

const plugin: PluginWithConfigs = {
  ...pluginBase,
  configs: {
    recommended
  }
}

export default plugin

export const configs = plugin.configs

export { rules } from "./rules/index.js"
