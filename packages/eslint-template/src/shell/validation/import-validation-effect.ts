// CHANGE: import validation effect
// WHY: suggest similar exports for named imports
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<ImportValidationResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
// INVARIANT: Valid | ImportNotFound
// COMPLEXITY: O(n log n)/O(n)
import { Match } from "effect"

import type { ImportValidationResult } from "../../core/index.js"
import { formatImportMessage, makeImportNotFoundResult, makeValidImportResult } from "../../core/index.js"
import type { BaseESLintNode } from "../../core/types/eslint-nodes.js"
import { baseValidationEffect, isValidImportCandidate } from "./validation-base-effect.js"

export const validateImportSpecifierEffect = (
  node: BaseESLintNode,
  importName: string,
  modulePath: string,
  containingFilePath: string
) => {
  const config = {
    makeValidResult: makeValidImportResult,
    makeInvalidResult: makeImportNotFoundResult,
    isValidCandidate: isValidImportCandidate
  }

  return baseValidationEffect(node, importName, modulePath, containingFilePath, config)
}

export const formatImportValidationMessage = (
  result: ImportValidationResult
): string =>
  Match.value(result).pipe(
    Match.when({ _tag: "Valid" }, () => ""),
    Match.when({ _tag: "ImportNotFound" }, (invalid) => {
      if (invalid.suggestions.length === 0) {
        return `Variable "${invalid.importName}" is not defined.`
      }
      return formatImportMessage(
        invalid.importName,
        invalid.modulePath,
        invalid.typeName,
        invalid.suggestions
      )
    }),
    Match.exhaustive
  )
