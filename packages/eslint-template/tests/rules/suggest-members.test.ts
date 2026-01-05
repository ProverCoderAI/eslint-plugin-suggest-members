import { suggestMembersRule } from "../../src/rules/suggest-members/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")

ruleTester.run("suggest-members", suggestMembersRule, {
  valid: [
    {
      filename,
      code: `
        const obj = { name: "ok", count: 1 }
        obj.name
        obj.count
      `
    },
    {
      filename,
      code: `
        const obj = { name: "ok" }
        obj["name"]
      `
    },
    {
      filename,
      code: `
        const obj = { name: "ok" }
        obj?.name
      `
    }
  ],
  invalid: [
    {
      filename,
      code: `
        const obj = { name: "ok", count: 1 }
        obj.nmae
      `,
      errors: [{ messageId: "suggestMembers" }]
    },
    {
      filename,
      code: `
        type Named = { readonly name: string }
        const variant: Named = { name: "ok" }
        const { na1me } = variant
        void na1me
      `,
      errors: [{ messageId: "suggestMembers" }]
    }
  ]
})
