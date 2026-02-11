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
import { AST_NODE_TYPES } from "@typescript-eslint/utils"
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint"
import type { Layer } from "effect"
import { Effect, pipe } from "effect"
import type * as ts from "typescript"

import {
  makeTypeScriptCompilerServiceLayer,
  type TypeScriptCompilerServiceTag
} from "../../shell/services/typescript-compiler.js"
import { getParserServicesForContext } from "../../shell/shared/import-validation-base.js"
import { createRule } from "../../shell/shared/rule-creator.js"
import { runValidationEffect } from "../../shell/shared/validation-runner.js"
import {
  formatMemberValidationMessage,
  validateMemberAccessEffectWithNodes,
  validateMemberPropertyNameEffect
} from "../../shell/validation/member-validation-effect.js"

interface NodeMap {
  readonly get: (key: TSESTree.Node) => ts.Node | undefined
}

const createValidateAndReport = (
  tsServiceLayer: Layer.Layer<TypeScriptCompilerServiceTag>,
  context: RuleContext<"suggestMembers", []>,
  esTreeNodeToTSNodeMap: NodeMap
) =>
(node: TSESTree.MemberExpression): void => {
  if (node.computed) return
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

const validatePatternProperty = (
  tsServiceLayer: Layer.Layer<TypeScriptCompilerServiceTag>,
  context: RuleContext<"suggestMembers", []>,
  esTreeNodeToTSNodeMap: NodeMap
) =>
(property: TSESTree.Property): void => {
  if (property.computed) return
  if (property.key.type !== AST_NODE_TYPES.Identifier) return
  if (property.parent.type !== AST_NODE_TYPES.ObjectPattern) return

  const tsParentNode = esTreeNodeToTSNodeMap.get(property.parent)
  if (!tsParentNode) return

  const validationEffect = pipe(
    validateMemberPropertyNameEffect(property.key.name, property.key, tsParentNode),
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

const defaultOptions: [] = []

export const suggestMembersRule = createRule(
  "suggest-members",
  {
    description: "enforce correct member names when accessing non-existent properties",
    messageId: "suggestMembers"
  },
  (context) => {
    const parserServices = getParserServicesForContext(context)
    if (!parserServices) return {}
    const program = parserServices.program
    if (!program) return {}
    const checker = program.getTypeChecker()
    const esTreeNodeToTSNodeMap = parserServices.esTreeNodeToTSNodeMap

    const tsServiceLayer = makeTypeScriptCompilerServiceLayer(checker, program)
    const validateAndReport = createValidateAndReport(
      tsServiceLayer,
      context,
      esTreeNodeToTSNodeMap
    )
    const validatePatternPropertyName = validatePatternProperty(
      tsServiceLayer,
      context,
      esTreeNodeToTSNodeMap
    )

    return {
      MemberExpression(node: TSESTree.MemberExpression): void {
        validateAndReport(node)
      },
      Property(node: TSESTree.Property): void {
        validatePatternPropertyName(node)
      }
    }
  },
  defaultOptions
)
