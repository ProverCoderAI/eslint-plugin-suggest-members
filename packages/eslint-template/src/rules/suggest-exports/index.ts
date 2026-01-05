// CHANGE: ESLint rule suggest-exports
// WHY: suggest similar exports in re-exports and local exports
// QUOTE(TZ): n/a
// REF: AGENTS.md RULES
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: ESLint reporting + TS service
// INVARIANT: only reports when suggestions exist
// COMPLEXITY: O(n log n)/O(n)
import type { TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import type { RuleContext, RuleListener } from "@typescript-eslint/utils/ts-eslint"
import { Effect } from "effect"

import type { TypeScriptServiceLayerContext } from "../../shell/shared/import-validation-base.js"
import {
  createTypeScriptServiceLayerForContext,
  getParserServicesForContext
} from "../../shell/shared/import-validation-base.js"
import { createExportValidationListener } from "../../shell/shared/import-validation-rule-factory.js"
import { runValidationEffect } from "../../shell/shared/validation-runner.js"
import {
  formatExportValidationMessage,
  validateExportAccessEffect
} from "../../shell/validation/export-validation-effect.js"
import {
  formatLocalExportValidationMessage,
  validateLocalExportIdentifierEffect
} from "../../shell/validation/local-export-validation-effect.js"

type SuggestExportsMessageId = "suggestExports"
type SuggestExportsOptions = []

const createRule = ESLintUtils.RuleCreator((name) =>
  `https://github.com/ton-ai-core/eslint-plugin-suggest-members#${name}`
)<SuggestExportsOptions, SuggestExportsMessageId>

const getModulePathFromExport = (
  node: TSESTree.ExportNamedDeclaration
): string | undefined => typeof node.source?.value === "string" ? node.source.value : undefined

const buildExportValidationListener = (
  context: RuleContext<SuggestExportsMessageId, SuggestExportsOptions>
): RuleListener =>
  createExportValidationListener(context, {
    validateSpecifier: validateExportAccessEffect,
    formatMessage: formatExportValidationMessage,
    messageId: "suggestExports"
  })

const buildLocalExportValidationListener = (
  context: RuleContext<SuggestExportsMessageId, SuggestExportsOptions>,
  tsService: TypeScriptServiceLayerContext
): RuleListener => {
  const parseResult = getParserServicesForContext(context)

  if (!parseResult) {
    return {}
  }

  const esTreeNodeToTSNodeMap = parseResult.esTreeNodeToTSNodeMap

  return {
    ExportNamedDeclaration(node) {
      const modulePath = getModulePathFromExport(node)
      if (modulePath) return

      for (const specifier of node.specifiers) {
        if (specifier.local.type !== AST_NODE_TYPES.Identifier) continue

        const tsLocal = esTreeNodeToTSNodeMap.get(specifier.local)

        const validationEffect = Effect.provide(
          validateLocalExportIdentifierEffect(specifier.local, tsLocal),
          tsService.layer
        )

        runValidationEffect({
          validationEffect,
          context,
          reportNode: specifier.local,
          messageId: "suggestExports",
          formatMessage: formatLocalExportValidationMessage
        })
      }
    }
  }
}

const buildListener = (
  context: RuleContext<SuggestExportsMessageId, SuggestExportsOptions>
): RuleListener => {
  const tsService = createTypeScriptServiceLayerForContext(context)
  const exportListener = buildExportValidationListener(context)
  const localListener = buildLocalExportValidationListener(context, tsService)

  return {
    ExportNamedDeclaration(node) {
      exportListener.ExportNamedDeclaration?.(node)
      localListener.ExportNamedDeclaration?.(node)
    }
  }
}

export const suggestExportsRule = createRule({
  name: "suggest-exports",
  meta: {
    type: "problem",
    docs: {
      description: "Suggest similar export names when importing non-existent exports"
    },
    messages: {
      suggestExports: "{{message}}"
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return buildListener(context)
  }
})
