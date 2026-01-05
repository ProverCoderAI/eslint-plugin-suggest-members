// CHANGE: shared missing-name validation base
// WHY: reuse core logic between missing-name and local-export validation
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<MissingNameValidationResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
// INVARIANT: Valid | MissingName
// COMPLEXITY: O(n log n)/O(n)
import { Effect, Match, pipe } from "effect"
import type * as ts from "typescript"

import type { TSESTree } from "@typescript-eslint/utils"
import type { MissingNameValidationResult } from "../../core/index.js"
import {
  findSimilarCandidatesEffect,
  formatMissingNameMessage,
  isValidCandidate,
  makeMissingNameResult,
  makeValidMissingNameResult,
  shouldSkipIdentifier
} from "../../core/index.js"
import type { SuggestionWithScore } from "../../core/types/domain.js"
import type { TypeScriptServiceError } from "../effects/errors.js"
import { type TypeScriptCompilerService, TypeScriptCompilerServiceTag } from "../services/typescript-compiler.js"
import { enrichSuggestionsWithSymbolMapEffect } from "./suggestion-signatures.js"

type MissingNameService = Pick<
  TypeScriptCompilerService,
  "getSymbolsInScope" | "getSymbolTypeSignature"
>

interface ScopeMetadata {
  readonly names: ReadonlyArray<string>
  readonly symbols: ReadonlyMap<string, ts.Symbol>
}

export interface MissingNameValidationConfig {
  readonly symbolFlags: ts.SymbolFlags
  readonly skipWhenNoSuggestions: boolean
}

const collectScopeMetadata = (
  tsNode: ts.Node,
  tsService: MissingNameService,
  symbolFlags: ts.SymbolFlags
): Effect.Effect<ScopeMetadata, TypeScriptServiceError> =>
  Effect.gen(function*(_) {
    const symbols = yield* _(
      tsService.getSymbolsInScope(tsNode, symbolFlags)
    )

    const names: Array<string> = []
    const map = new Map<string, ts.Symbol>()
    for (const symbol of symbols) {
      const name = symbol.getName()
      if (!isValidCandidate(name)) continue
      names.push(name)
      map.set(name, symbol)
    }

    return { names, symbols: map }
  })

const enrichMissingNameSuggestionsEffect = (
  suggestions: ReadonlyArray<SuggestionWithScore>,
  metadata: ScopeMetadata,
  tsNode: ts.Node,
  tsService: MissingNameService
): Effect.Effect<ReadonlyArray<SuggestionWithScore>, TypeScriptServiceError> =>
  enrichSuggestionsWithSymbolMapEffect(
    suggestions,
    metadata.symbols,
    tsNode,
    tsService.getSymbolTypeSignature
  )

interface BuildMissingNameResultParams {
  readonly name: string
  readonly node: TSESTree.Identifier
  readonly tsNode: ts.Node
  readonly tsService: MissingNameService
  readonly metadata: ScopeMetadata
  readonly config: MissingNameValidationConfig
}

const buildMissingNameResultEffect = (
  params: BuildMissingNameResultParams
): Effect.Effect<MissingNameValidationResult, TypeScriptServiceError> => {
  const { config, metadata, name, node, tsNode, tsService } = params
  return (
    pipe(
      findSimilarCandidatesEffect(name, metadata.names),
      Effect.flatMap((suggestions) =>
        config.skipWhenNoSuggestions && suggestions.length === 0
          ? Effect.succeed(makeValidMissingNameResult())
          : pipe(
            enrichMissingNameSuggestionsEffect(suggestions, metadata, tsNode, tsService),
            Effect.map((enriched) => makeMissingNameResult(name, enriched, node))
          )
      )
    )
  )
}

export const validateMissingNameIdentifierEffectBase = (
  identifier: TSESTree.Identifier,
  tsNode: ts.Node,
  config: MissingNameValidationConfig
): Effect.Effect<
  MissingNameValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
> =>
  pipe(
    Effect.gen(function*(_) {
      if (shouldSkipIdentifier(identifier.name)) {
        return makeValidMissingNameResult()
      }

      const tsService = yield* _(TypeScriptCompilerServiceTag)
      const metadata = yield* _(
        collectScopeMetadata(tsNode, tsService, config.symbolFlags)
      )

      if (metadata.names.includes(identifier.name)) {
        return makeValidMissingNameResult()
      }

      return yield* _(
        buildMissingNameResultEffect({
          name: identifier.name,
          node: identifier,
          tsNode,
          tsService,
          metadata,
          config
        })
      )
    })
  )

export const formatMissingNameValidationMessage = (
  result: MissingNameValidationResult
): string =>
  Match.value(result).pipe(
    Match.when({ _tag: "Valid" }, () => ""),
    Match.when(
      { _tag: "MissingName" },
      (missing) => formatMissingNameMessage(missing.name, missing.suggestions)
    ),
    Match.exhaustive
  )
