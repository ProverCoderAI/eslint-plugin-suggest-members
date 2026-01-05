// CHANGE: ESLint rule suggest-members
// WHY: report typos in member access with suggestions
// QUOTE(TZ): n/a
// REF: AGENTS.md RULES
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: ESLint reporting + TS service
// INVARIANT: only reports when suggestions exist
// COMPLEXITY: O(n log n)/O(n)
import type { TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint"
import type { Layer } from "effect"
import { Effect, pipe } from "effect"
import type * as ts from "typescript"

import {
  makeTypeScriptCompilerServiceLayer,
  type TypeScriptCompilerServiceTag
} from "../../shell/services/typescript-compiler.js"
import { runValidationEffect } from "../../shell/shared/validation-runner.js"
import {
  formatMemberValidationMessage,
  validateMemberAccessEffectWithNodes,
  validateMemberPropertyNameEffect
} from "../../shell/validation/member-validation-effect.js"

const createRule = ESLintUtils.RuleCreator((name) =>
  `https://github.com/ton-ai-core/eslint-plugin-suggest-members#${name}`
)

interface NodeMap {
  readonly get: (key: TSESTree.Node) => ts.Node | undefined
}

const createValidateAndReport = (
  tsServiceLayer: Layer.Layer<TypeScriptCompilerServiceTag>,
  context: RuleContext<"suggestMembers", []>,
  esTreeNodeToTSNodeMap: NodeMap
) =>
(node: TSESTree.MemberExpression): void => {
  if (node.computed || node.optional) return
  if (node.property.type !== AST_NODE_TYPES.Identifier) return

  const tsObjectNode = esTreeNodeToTSNodeMap.get(node.object)
  if (!tsObjectNode) return

  const validationEffect = pipe(
    validateMemberAccessEffectWithNodes(node, tsObjectNode),
    Effect.provide(tsServiceLayer)
  )

  runValidationEffect({
    validationEffect,
    context,
    reportNode: node.property,
    messageId: "suggestMembers",
    formatMessage: formatMemberValidationMessage
  })
}

const validateObjectPatternProperty = (
  tsServiceLayer: Layer.Layer<TypeScriptCompilerServiceTag>,
  context: RuleContext<"suggestMembers", []>,
  esTreeNodeToTSNodeMap: NodeMap
) =>
(property: TSESTree.Property): void => {
  if (property.computed) return
  if (property.key.type !== AST_NODE_TYPES.Identifier) return
  if (property.parent.type !== AST_NODE_TYPES.ObjectPattern) return

  const tsPatternNode = esTreeNodeToTSNodeMap.get(property.parent)
  if (!tsPatternNode) return

  const validationEffect = pipe(
    validateMemberPropertyNameEffect(property.key.name, property.key, tsPatternNode),
    Effect.provide(tsServiceLayer)
  )

  runValidationEffect({
    validationEffect,
    context,
    reportNode: property.key,
    messageId: "suggestMembers",
    formatMessage: formatMemberValidationMessage
  })
}

export const suggestMembersRule = createRule({
  name: "suggest-members",
  meta: {
    type: "problem",
    docs: {
      description: "enforce correct member names when accessing non-existent properties"
    },
    messages: {
      suggestMembers: "{{message}}"
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context)
    const program = parserServices.program
    const checker = program.getTypeChecker()
    const esTreeNodeToTSNodeMap = parserServices.esTreeNodeToTSNodeMap

    const tsServiceLayer = makeTypeScriptCompilerServiceLayer(checker, program)
    const validateAndReport = createValidateAndReport(
      tsServiceLayer,
      context,
      esTreeNodeToTSNodeMap
    )
    const validatePatternProperty = validateObjectPatternProperty(
      tsServiceLayer,
      context,
      esTreeNodeToTSNodeMap
    )

    return {
      MemberExpression(node: TSESTree.MemberExpression): void {
        validateAndReport(node)
      },
      Property(node: TSESTree.Property): void {
        validatePatternProperty(node)
      }
    }
  }
})
