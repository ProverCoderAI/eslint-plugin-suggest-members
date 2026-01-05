// CHANGE: ESLint rule suggest-module-paths
// WHY: suggest similar module paths for missing imports
// QUOTE(TZ): n/a
// REF: AGENTS.md RULES
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: ESLint reporting + filesystem
// INVARIANT: only reports when suggestions exist
// COMPLEXITY: O(n log n)/O(n)
import type { TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils"
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint"
import { Effect, type Layer, pipe } from "effect"

import { isModulePath } from "../../core/validators/index.js"
import { type FilesystemServiceTag, makeFilesystemServiceLayer } from "../../shell/services/filesystem.js"
import { runValidationEffect } from "../../shell/shared/validation-runner.js"
import {
  formatModulePathValidationMessage,
  validateModulePathEffect
} from "../../shell/validation/module-validation-effect.js"

const createRule = ESLintUtils.RuleCreator((name) =>
  `https://github.com/ton-ai-core/eslint-plugin-suggest-members#${name}`
)

const createValidateAndReport = (
  fsServiceLayer: Layer.Layer<FilesystemServiceTag>,
  currentFilePath: string,
  context: RuleContext<"suggestModulePaths", []>
) =>
(node: object, reportNode: TSESTree.Node, modulePath: string): void => {
  if (!isModulePath(modulePath)) return

  const validationEffect = pipe(
    validateModulePathEffect(node, modulePath, currentFilePath),
    Effect.provide(fsServiceLayer)
  )

  runValidationEffect({
    validationEffect,
    context,
    reportNode,
    messageId: "suggestModulePaths",
    formatMessage: formatModulePathValidationMessage
  })
}

export const suggestModulePathsRule = createRule({
  name: "suggest-module-paths",
  meta: {
    type: "problem",
    docs: {
      description: "enforce correct module paths by suggesting similar paths when importing non-existent modules"
    },
    messages: {
      suggestModulePaths: "{{message}}"
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const fsServiceLayer = makeFilesystemServiceLayer()
    const currentFilePath = context.filename
    const validateAndReport = createValidateAndReport(
      fsServiceLayer,
      currentFilePath,
      context
    )

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        const modulePath = node.source.value
        if (typeof modulePath !== "string") return
        validateAndReport(node, node.source, modulePath)
      },
      CallExpression(node: TSESTree.CallExpression): void {
        if (
          node.callee.type !== AST_NODE_TYPES.Identifier ||
          node.callee.name !== "require"
        ) {
          return
        }

        const firstArg = node.arguments[0]
        if (!firstArg || firstArg.type !== AST_NODE_TYPES.Literal) return
        if (typeof firstArg.value !== "string") return

        const modulePath = firstArg.value
        validateAndReport(node, firstArg, modulePath)
      }
    }
  }
})
