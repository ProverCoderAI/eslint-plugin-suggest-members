import { suggestExportsRule } from "../../src/rules/suggest-exports/index.js"
import { suggestImportsRule } from "../../src/rules/suggest-imports/index.js"
import { createRuleTester, resolveFixturePath } from "../utils/rule-tester.js"

const ruleTester = createRuleTester()
const filename = resolveFixturePath("consumer.ts")

const validImportsCode = `
  import { useState, useEffect } from "./modules/exports"
  useState()
  useEffect()
`

const invalidImportCode = `
  import { useStae } from "./modules/exports"
  useStae()
`

const invalidImportMessage =
  "Export 'useStae' does not exist on type 'typeof import(\"/home/user/eslint-plugin-suggest-members/packages/eslint-template/tests/fixtures/modules/exports\")'. Did you mean:\n" +
  "  - useState(): number\n" +
  "  - useMemo(): number\n" +
  "  - useEffect(): void\n" +
  "  - useCallback(): string"

ruleTester.run("suggest-imports", suggestImportsRule, {
  valid: [
    {
      filename,
      code: validImportsCode
    }
  ],
  invalid: [
    {
      filename,
      code: invalidImportCode,
      errors: [{ messageId: "suggestImports", data: { message: invalidImportMessage } }]
    }
  ]
})

const validExportModuleCode = `
  export { useState } from "./modules/exports"
`

const validExportLocalCode = `
  const formatGreeting = () => "ok"
  export { formatGreeting }
`

const invalidExportModuleCode = `
  export { useStae } from "./modules/exports"
`

const invalidExportLocalCode = `
  const formatGreeting = () => "ok"
  export { formatGree1ting }
`

const invalidExportModuleMessage = invalidImportMessage

const invalidExportLocalMessage = "Cannot find name 'formatGree1ting'. Did you mean:\n" +
  "  - formatGreeting(): string\n" +
  "  - FormData: typeof undici.FormData"

ruleTester.run("suggest-exports", suggestExportsRule, {
  valid: [
    {
      filename,
      code: validExportModuleCode
    },
    {
      filename,
      code: validExportLocalCode
    }
  ],
  invalid: [
    {
      filename,
      code: invalidExportModuleCode,
      errors: [{ messageId: "suggestExports", data: { message: invalidExportModuleMessage } }]
    },
    {
      filename,
      code: invalidExportLocalCode,
      errors: [{ messageId: "suggestExports", data: { message: invalidExportLocalMessage } }]
    }
  ]
})
