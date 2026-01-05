import { suggestModulePathsRule } from "../../src/rules/suggest-module-paths/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")

ruleTester.run("suggest-module-paths", suggestModulePathsRule, {
  valid: [
    {
      filename,
      code: `
        import { alpha } from "./module-paths/alpha"
        alpha
      `
    }
  ],
  invalid: [
    {
      filename,
      code: `
        import { alpha } from "./module-paths/alhpa"
        alpha
      `,
      errors: [{ messageId: "suggestModulePaths" }]
    },
    {
      filename,
      code: `
        import { pipe } from "eff1ect"
        pipe
      `,
      errors: [{ messageId: "suggestModulePaths" }]
    }
  ]
})
