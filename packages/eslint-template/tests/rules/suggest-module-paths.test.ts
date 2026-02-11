import { suggestModulePathsRule } from "../../src/rules/suggest-module-paths/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")
const monorepoFilename = resolveFixturePath("monorepo/packages/consumer/src/index.ts")
const localModulePathMessage = "Cannot find module \"./module-paths/alhpa\". Did you mean:\n" +
  "  - ./module-paths/alpha\n" +
  "  - ./module-paths/beta"
const externalModulePathMessage =
  "Cannot find module 'eff1ect' or its corresponding type declarations. Did you mean:\n" +
  "  - effect"

ruleTester.run("suggest-module-paths", suggestModulePathsRule, {
  valid: [
    {
      filename,
      code: `
        import { alpha } from "./module-paths/alpha"
        alpha
      `
    },
    // monorepo: importing an existing dependency should not produce a false positive
    {
      filename,
      code: `
        import { pipe } from "effect"
        pipe
      `
    },
    {
      filename,
      code: `
        import "./module-paths/admin-invitations.css"
      `
    },
    {
      filename: monorepoFilename,
      code: `
        import { moduleConfig } from "auth-admin/app/lib/auth-config"
        void moduleConfig
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
