import { Console, Effect, pipe } from "effect"

import { formatGree1ting } from "../core/greeting.js"
import { readGreetingVariant } from "../shell/cli.js"

/**
 * Compose the CLI program as a single effect.
 *
 * @returns Effect that returns the greeting string and logs it once on success.
 *
 * @pure false - uses Console output
 * @effect Console
 * @invariant forall args in Argv: decode(args) = v -> logs exactly one greeting
 * @precondition true
 * @postcondition exists greeting: returned(greeting) and logged(greeting)
 * @complexity O(1)
 * @throws Never - all errors are typed in the Effect error channel
 */
// CHANGE: extract the composed program into a reusable Effect
// WHY: keep the entrypoint as a thin platform runtime shell and make testing deterministic
// QUOTE(TZ): "\u0414\u0430 \u0434\u0430\u0432\u0430\u0439 \u0442\u0430\u043a \u044d\u0442\u043e \u0431\u043e\u043b\u0435\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0430\u044f \u0440\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f"
// REF: user-2025-12-19-platform-node
// SOURCE: https://effect.website/docs/platform/runtime/ "runMain helps you execute a main effect with built-in error handling, logging, and signal management."
// FORMAT THEOREM: forall args in Argv: decode(args) = v -> log(formatGreeting(v))
// PURITY: SHELL
// EFFECT: Effect<string, S.ParseError, Console>
// INVARIANT: exactly one log entry per successful parse
// COMPLEXITY: O(1)/O(1)
export const program = pipe(
  readGreetingVariant,
  Effect.map((variant) => formatGreeting(variant)),
  Effect.tap(Console.log)
)
