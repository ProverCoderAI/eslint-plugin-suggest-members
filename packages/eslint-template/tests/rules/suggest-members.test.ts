import { suggestMembersRule } from "../../src/rules/suggest-members/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")
const memberAccessMessage =
  "Property 'nmae' does not exist on type '{ name: string; count: number; }'. Did you mean:\n" +
  "  - name: string"
const memberOptionalAccessMessage = "Property 'nmae' does not exist on type '{ name: string; }'. Did you mean:\n" +
  "  - name: string"
const memberPatternMessage = "Property 'na1me' does not exist on type 'Named'. Did you mean:\n" +
  "  - name: string"

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
    },
    {
      filename,
      code: `
        const videoId = "v1"
        const projectId = "p1"
        const query = new URLSearchParams({
          videoId,
          projectId
        })
        void query
      `
    },
    {
      filename,
      code: `
        type JsonValue =
          | string
          | number
          | boolean
          | null
          | ReadonlyArray<JsonValue>
          | { readonly [key: string]: JsonValue }

        const config: JsonValue = { redirectPath: "/" }
        void config
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
      errors: [{
        messageId: "suggestMembers",
        data: {
          message: memberAccessMessage
        }
      }]
    },
    {
      filename,
      code: `
        const obj = { name: "ok" }
        obj?.nmae
      `,
      errors: [{
        messageId: "suggestMembers",
        data: {
          message: memberOptionalAccessMessage
        }
      }]
    },
    {
      filename,
      code: `
        type Named = { readonly name: string }
        const variant: Named = { name: "ok" }
        const { na1me } = variant
        void na1me
      `,
      errors: [{
        messageId: "suggestMembers",
        data: {
          message: memberPatternMessage
        }
      }]
    }
  ]
})
