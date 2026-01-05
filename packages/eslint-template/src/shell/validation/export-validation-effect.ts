// CHANGE: export validation effect
// WHY: suggest similar exports for re-exports
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<ExportValidationResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
// INVARIANT: Valid | ExportNotFound
// COMPLEXITY: O(n log n)/O(n)
import { Match } from "effect"

import type { ExportValidationResult } from "../../core/index.js"
import { formatExportMessage, makeExportNotFoundResult, makeValidExportResult } from "../../core/index.js"
import type { BaseESLintNode } from "../../core/types/eslint-nodes.js"
import { baseValidationEffect, isValidExportCandidate } from "./validation-base-effect.js"

export const validateExportAccessEffect = (
  node: BaseESLintNode,
  exportName: string,
  modulePath: string,
  containingFilePath: string
) => {
  const config = {
    makeValidResult: makeValidExportResult,
    makeInvalidResult: makeExportNotFoundResult,
    isValidCandidate: isValidExportCandidate
  }

  return baseValidationEffect(node, exportName, modulePath, containingFilePath, config)
}

export const formatExportValidationMessage = (
  result: ExportValidationResult
): string =>
  Match.value(result).pipe(
    Match.when({ _tag: "Valid" }, () => ""),
    Match.when({ _tag: "ExportNotFound" }, (invalid) => {
      if (invalid.suggestions.length === 0) {
        return formatExportMessage(
          invalid.exportName,
          invalid.modulePath,
          invalid.typeName,
          invalid.suggestions
        )
      }
      return formatExportMessage(
        invalid.exportName,
        invalid.modulePath,
        invalid.typeName,
        invalid.suggestions
      )
    }),
    Match.exhaustive
  )
