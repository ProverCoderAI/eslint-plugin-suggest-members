// CHANGE: validation helpers for import/export rules
// WHY: shared reporting + fallback handling
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect.runSyncExit
// INVARIANT: reports only when message non-empty
// COMPLEXITY: O(1)/O(1)
import type { TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES } from "@typescript-eslint/utils"
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint"
import { Effect } from "effect"

import { shouldSkipIdentifier } from "../../core/validators/index.js"
import type { TypeScriptServiceError } from "../effects/errors.js"
import { makeFilesystemServiceLayer } from "../services/filesystem.js"
import type { ImportValidationConfig } from "./import-validation-base.js"
import { runEffect } from "./validation-runner.js"

interface BaseValidationParams<TResult> {
  readonly imported: TSESTree.Identifier
  readonly importName: string
  readonly modulePath: string
  readonly config: ImportValidationConfig<TResult>
  readonly context: RuleContext<string, ReadonlyArray<string>>
}

export const isValidImportIdentifier = (
  imported: TSESTree.Node
): imported is TSESTree.Identifier => {
  if (imported.type !== AST_NODE_TYPES.Identifier) return false
  return !shouldSkipIdentifier(imported.name)
}

const reportValidationResult = <TResult>(
  imported: TSESTree.Identifier,
  config: ImportValidationConfig<TResult>,
  context: RuleContext<string, ReadonlyArray<string>>,
  result: TResult
): void => {
  const message = config.formatMessage(result)
  if (message.length === 0) return

  context.report({
    node: imported,
    messageId: config.messageId,
    data: { message }
  })
}

const tryFallbackValidationOnly = <TResult>(
  params: BaseValidationParams<TResult>
): void => {
  const { config, context, importName, imported, modulePath } = params

  if (!config.fallbackValidationEffect) return

  const fallbackEffect = config.fallbackValidationEffect(
    importName,
    modulePath,
    context.filename || ""
  )

  const result = runEffect(
    Effect.provide(fallbackEffect, makeFilesystemServiceLayer())
  )
  if (!result) return

  reportValidationResult(imported, config, context, result)
}

export const tryValidationWithFallback = <TResult>(
  params: BaseValidationParams<TResult> & {
    readonly validationEffect: Effect.Effect<TResult, TypeScriptServiceError>
  }
): void => {
  const {
    config,
    context,
    importName,
    imported,
    modulePath,
    validationEffect
  } = params

  const result = runEffect(validationEffect)
  if (!result) {
    tryFallbackValidationOnly({ imported, importName, modulePath, config, context })
    return
  }

  reportValidationResult(imported, config, context, result)
}
