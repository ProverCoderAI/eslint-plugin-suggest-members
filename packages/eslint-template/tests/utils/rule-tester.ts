import path from "node:path"
import { fileURLToPath } from "node:url"

import * as tsParser from "@typescript-eslint/parser"
import { RuleTester } from "@typescript-eslint/rule-tester"
import * as vitest from "vitest"

RuleTester.afterAll = vitest.afterAll
RuleTester.it = vitest.it
RuleTester.itOnly = vitest.it.only
RuleTester.describe = vitest.describe

const tsconfigRootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
)

export const createRuleTester = () =>
  new RuleTester({
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.ts*"],
          defaultProject: "tsconfig.json"
        },
        tsconfigRootDir
      }
    }
  })

export const resolveFixturePath = (relativePath: string): string =>
  path.join(tsconfigRootDir, "tests", "fixtures", relativePath)
