// CHANGE: shared validation runner
// WHY: execute Effect validations synchronously for ESLint
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect.runSyncExit
// INVARIANT: reports occur in same tick
// COMPLEXITY: O(1)/O(1)
import type { TSESTree } from "@typescript-eslint/utils"
import type { RuleContext } from "@typescript-eslint/utils/ts-eslint"
import { Effect, Exit } from "effect"

interface ValidationConfig<T extends { _tag: string }, E> {
  readonly validationEffect: Effect.Effect<T, E>
  readonly context: RuleContext<string, readonly []>
  readonly reportNode: TSESTree.Node
  readonly messageId: string
  readonly formatMessage: (result: T) => string
  readonly fallbackEffect?: Effect.Effect<T, E>
}

export const runEffect = <T, E>(effect: Effect.Effect<T, E>): T | null =>
  Exit.match(Effect.runSyncExit(effect), {
    onFailure: () => null,
    onSuccess: (value) => value
  })

export const runValidationEffect = <T extends { _tag: string }, E>(
  config: ValidationConfig<T, E>
): void => {
  const { context, fallbackEffect, formatMessage, messageId, reportNode, validationEffect } = config

  const result = runEffect(validationEffect) ?? (fallbackEffect ? runEffect(fallbackEffect) : null)

  if (!result) return
  if (result._tag === "Valid") return

  const message = formatMessage(result)
  context.report({
    node: reportNode,
    messageId,
    data: { message }
  })
}
