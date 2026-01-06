import { suggestMissingNamesRule } from "../../src/rules/suggest-missing-names/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")
const missingNameMessage = "Cannot find name 'formatGreeting'. Did you mean:\n" +
  "  - formatGree1ting(name: string): string\n" +
  "  - FormData: typeof undici.FormData"

ruleTester.run("suggest-missing-names", suggestMissingNamesRule, {
  valid: [
    {
      filename,
      code: `
        const formatGreeting = (name: string) => name
        formatGreeting("ok")
      `
    }
  ],
  invalid: [
    {
      filename,
      code: `
        const formatGree1ting = (name: string) => name
        formatGreeting("ok")
      `,
      errors: [{
        messageId: "suggestMissingNames",
        data: {
          message: missingNameMessage
        }
      }]
    }
  ]
})
