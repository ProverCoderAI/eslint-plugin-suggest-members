import type { TSESLint } from "@typescript-eslint/utils"
import { describe, expect, it } from "vitest"

import plugin from "../src/index.js"

type PluginRules = NonNullable<TSESLint.FlatConfig.Plugin["rules"]>
type PluginRule = PluginRules[string]

const assertNonEmptyString = (value: string | undefined): void => {
  expect(typeof value).toBe("string")
  if (typeof value === "string") {
    expect(value.length).toBeGreaterThan(0)
  }
}

const assertRuleShape = (rule: PluginRule | undefined): void => {
  expect(rule).toBeDefined()
}

describe("eslint plugin signature", () => {
  it("satisfies eslint plugin signature", () => {
    const pluginTyped: TSESLint.FlatConfig.Plugin = plugin
    expect(pluginTyped).toBe(plugin)
  })

  it("exposes meta with name and version", () => {
    const pluginTyped: TSESLint.FlatConfig.Plugin = plugin
    assertNonEmptyString(pluginTyped.meta?.name)
    assertNonEmptyString(pluginTyped.meta?.version)
  })

  it("exposes rules with valid shape", () => {
    const pluginTyped: TSESLint.FlatConfig.Plugin = plugin
    const rules = pluginTyped.rules
    expect(rules).toBeDefined()
    if (!rules) return

    const ruleNames = Object.keys(rules)
    expect(ruleNames.length).toBeGreaterThan(0)
    for (const ruleName of ruleNames) {
      assertRuleShape(rules[ruleName])
    }
  })

  it("exposes recommended config", () => {
    const pluginTyped: TSESLint.FlatConfig.Plugin = plugin
    const configs = pluginTyped.configs
    expect(configs).toBeDefined()
    if (!configs) return

    const recommended = configs["recommended"]
    expect(recommended).toBeDefined()
    if (!recommended) return

    const configList = Array.isArray(recommended) ? recommended : [recommended]

    expect(configList.length).toBeGreaterThan(0)
    for (const config of configList) {
      expect(config.rules).toBeDefined()
      if (config.rules) {
        expect(Object.keys(config.rules).length).toBeGreaterThan(0)
      }
      expect(config.plugins).toBeDefined()
      if (config.plugins) {
        expect(Object.keys(config.plugins).length).toBeGreaterThan(0)
      }
    }
  })
})
