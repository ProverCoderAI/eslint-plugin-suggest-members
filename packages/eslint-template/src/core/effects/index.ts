// CHANGE: Effect-wrapped core computations
// WHY: unify with Effect-based shell
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect composition
// SOURCE: n/a
// FORMAT THEOREM: Effect.succeed(pure(x))
// PURITY: CORE
// EFFECT: Effect<Success, never, never>
// INVARIANT: same result as pure functions
// COMPLEXITY: O(n log n)/O(1)
import { Effect, pipe } from "effect"

import { formatSuggestionMessage } from "../formatting/messages.js"
import { findSimilarCandidates } from "../suggestion/engine.js"
import type { SuggestionWithScore } from "../types/domain.js"
import { isValidCandidate } from "../validation/candidates.js"

export const findSimilarCandidatesEffect = (
  userInput: string,
  candidates: ReadonlyArray<string>
): Effect.Effect<ReadonlyArray<SuggestionWithScore>> => Effect.succeed(findSimilarCandidates(userInput, candidates))

export const isValidCandidateEffect = (
  candidate: string,
  userInput: string
): Effect.Effect<boolean> => Effect.succeed(isValidCandidate(candidate, userInput))

export const formatSuggestionMessageEffect = (
  propertyName: string,
  suggestions: ReadonlyArray<SuggestionWithScore>
): Effect.Effect<string> =>
  Effect.succeed(
    suggestions.length === 0
      ? `Property "${propertyName}" does not exist.`
      : pipe(
        formatSuggestionMessage(suggestions),
        (message) => `Property "${propertyName}" does not exist. ${message}`
      )
  )
