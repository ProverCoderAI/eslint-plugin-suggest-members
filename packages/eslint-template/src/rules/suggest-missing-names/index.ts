// CHANGE: ESLint rule suggest-missing-names
// WHY: report unresolved identifiers with similar in-scope suggestions
// QUOTE(TZ): n/a
// REF: AGENTS.md RULES
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: ESLint reporting + TS service
// INVARIANT: only reports for unresolved value references
// COMPLEXITY: O(n log n)/O(n)
import type { TSESLint, TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import type { RuleContext, RuleListener } from "@typescript-eslint/utils/ts-eslint"
import { Effect } from "effect"

import {
  createTypeScriptServiceLayerForContext,
  getParserServicesForContext
} from "../../shell/shared/import-validation-base.js"
import { runValidationEffect } from "../../shell/shared/validation-runner.js"
import {
  formatMissingNameValidationMessage,
  validateMissingNameIdentifierEffect
} from "../../shell/validation/missing-name-validation-effect.js"

type Reference = TSESLint.Scope.Reference

const isValueIdentifierReference = (
  reference: Reference
): reference is Reference & { readonly identifier: TSESTree.Identifier } => {
  if (!reference.isValueReference) return false
  if (reference.resolved !== null) return false
  return reference.identifier.type === AST_NODE_TYPES.Identifier
}

const isImportOrExportSpecifier = (
  identifier: TSESTree.Identifier
): boolean => {
  const parent = identifier.parent
  if (parent.type === AST_NODE_TYPES.ExportSpecifier) return true
  if (parent.type === AST_NODE_TYPES.ImportSpecifier) return true
  if (parent.type === AST_NODE_TYPES.ImportDefaultSpecifier) return true
  if (parent.type === AST_NODE_TYPES.ImportNamespaceSpecifier) return true
  return parent.type === AST_NODE_TYPES.TSImportEqualsDeclaration
}

const collectUnresolvedIdentifiers = (
  scope: TSESLint.Scope.Scope
): ReadonlyArray<TSESTree.Identifier> => {
  const unresolved: Array<TSESTree.Identifier> = []

  for (const reference of scope.through) {
    if (!isValueIdentifierReference(reference)) continue
    const identifier = reference.identifier
    if (isImportOrExportSpecifier(identifier)) continue
    unresolved.push(identifier)
  }

  return unresolved
}

const buildListener = (
  context: RuleContext<"suggestMissingNames", []>
): RuleListener => {
  const tsService = createTypeScriptServiceLayerForContext(context)
  if (!tsService.hasTypeScript) return {}

  const parseResult = getParserServicesForContext(context)
  if (!parseResult) return {}

  const esTreeNodeToTSNodeMap = parseResult.esTreeNodeToTSNodeMap

  return {
    "Program:exit"() {
      const sourceCode = context.sourceCode
      const scope = sourceCode.getScope(sourceCode.ast)
      const identifiers = collectUnresolvedIdentifiers(scope)

      for (const identifier of identifiers) {
        const tsNode = esTreeNodeToTSNodeMap.get(identifier)

        const validationEffect = Effect.provide(
          validateMissingNameIdentifierEffect(identifier, tsNode),
          tsService.layer
        )

        runValidationEffect({
          validationEffect,
          context,
          reportNode: identifier,
          messageId: "suggestMissingNames",
          formatMessage: formatMissingNameValidationMessage
        })
      }
    }
  }
}

export const suggestMissingNamesRule = ESLintUtils.RuleCreator((name) =>
  `https://github.com/ton-ai-core/eslint-plugin-suggest-members#${name}`
)({
  name: "suggest-missing-names",
  meta: {
    type: "problem",
    docs: {
      description: "suggest similar identifiers for unresolved names"
    },
    messages: {
      suggestMissingNames: "{{message}}"
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return buildListener(context)
  }
})
