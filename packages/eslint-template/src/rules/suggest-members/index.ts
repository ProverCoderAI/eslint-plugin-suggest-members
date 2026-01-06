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

import type { MemberValidationResult } from "../../core/index.js"
import type { TypeScriptServiceError } from "../../shell/effects/errors.js"
import {
  makeTypeScriptCompilerServiceLayer,
  type TypeScriptCompilerServiceTag
} from "../../shell/services/typescript-compiler.js"
import { runValidationEffect } from "../../shell/shared/validation-runner.js"
import {
  formatMemberValidationMessage,
  validateMemberAccessEffectWithNodes,
  validateMemberPropertyNameEffect,
  validateObjectLiteralPropertyNameEffect
} from "../../shell/validation/member-validation-effect.js"

const createRule = ESLintUtils.RuleCreator((name) =>
  `https://github.com/ton-ai-core/eslint-plugin-suggest-members#${name}`
)

interface NodeMap {
  readonly get: (key: TSESTree.Node) => ts.Node | undefined
}

type MemberValidationEffect = Effect.Effect<
  MemberValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
>

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

const validateObjectProperty = (
  tsServiceLayer: Layer.Layer<TypeScriptCompilerServiceTag>,
  context: RuleContext<"suggestMembers", []>,
  esTreeNodeToTSNodeMap: NodeMap,
  parentType: AST_NODE_TYPES.ObjectExpression | AST_NODE_TYPES.ObjectPattern,
  buildValidationEffect: (
    propertyName: string,
    reportNode: TSESTree.Identifier,
    tsNode: ts.Node
  ) => MemberValidationEffect
) =>
(property: TSESTree.Property): void => {
  if (property.computed) return
  if (property.key.type !== AST_NODE_TYPES.Identifier) return
  if (property.parent.type !== parentType) return

  const tsParentNode = esTreeNodeToTSNodeMap.get(property.parent)
  if (!tsParentNode) return

  const validationEffect = pipe(
    buildValidationEffect(property.key.name, property.key, tsParentNode),
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
    const validatePatternProperty = validateObjectProperty(
      tsServiceLayer,
      context,
      esTreeNodeToTSNodeMap,
      AST_NODE_TYPES.ObjectPattern,
      (propertyName, node, tsNode) => validateMemberPropertyNameEffect(propertyName, node, tsNode)
    )
    const validateLiteralProperty = validateObjectProperty(
      tsServiceLayer,
      context,
      esTreeNodeToTSNodeMap,
      AST_NODE_TYPES.ObjectExpression,
      (propertyName, node, tsNode) => validateObjectLiteralPropertyNameEffect(propertyName, node, tsNode)
    )

    return {
      MemberExpression(node: TSESTree.MemberExpression): void {
        validateAndReport(node)
      },
      Property(node: TSESTree.Property): void {
        validatePatternProperty(node)
        validateLiteralProperty(node)
      }
    }
  }
})
