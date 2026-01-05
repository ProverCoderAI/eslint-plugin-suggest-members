import { suggestExportsRule } from "../../src/rules/suggest-exports/index.js"
import { suggestImportsRule } from "../../src/rules/suggest-imports/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")

ruleTester.run("suggest-imports", suggestImportsRule, {
  valid: [
    {
      filename,
      code: `
        import { useState, useEffect } from "./modules/exports"
        useState()
        useEffect()
      `
    }
  ],
  invalid: [
    {
      filename,
      code: `
        import { useStae } from "./modules/exports"
        useStae()
      `,
      errors: [{ messageId: "suggestImports" }]
    }
  ]
})

ruleTester.run("suggest-exports", suggestExportsRule, {
  valid: [
    {
      filename,
      code: `
        export { useState } from "./modules/exports"
      `
    },
    {
      filename,
      code: `
        const formatGreeting = () => "ok"
        export { formatGreeting }
      `
    }
  ],
  invalid: [
    {
      filename,
      code: `
        export { useStae } from "./modules/exports"
      `,
      errors: [{ messageId: "suggestExports" }]
    },
    {
      filename,
      code: `
        const formatGreeting = () => "ok"
        export { formatGree1ting }
      `,
      errors: [{ messageId: "suggestExports" }]
    }
  ]
})
