import { suggestModulePathsRule } from "../../src/rules/suggest-module-paths/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")
const localModulePathMessage = "Cannot find module \"./module-paths/alhpa\". Did you mean:\n" +
  "  - ./module-paths/alpha\n" +
  "  - ./module-paths/beta"
const externalModulePathMessage =
  "Cannot find module 'eff1ect' or its corresponding type declarations. Did you mean:\n" +
  "  - effect\n" +
  "  - @effect/cli\n" +
  "  - @effect/rpc\n" +
  "  - @effect/sql"

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
      errors: [{
        messageId: "suggestModulePaths",
        data: {
          message: localModulePathMessage
        }
      }]
    },
    {
      filename,
      code: `
        import { pipe } from "eff1ect"
        pipe
      `,
      errors: [{
        messageId: "suggestModulePaths",
        data: {
          message: externalModulePathMessage
        }
      }]
    }
  ]
})
