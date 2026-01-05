// CHANGE: shared base validation for import/export
// WHY: eliminate duplication
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<TResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
// INVARIANT: Valid | Invalid
// COMPLEXITY: O(n log n)/O(n)
import { Effect, pipe } from "effect"

import { findSimilarCandidatesEffect, isTypeOnlyImport, shouldSkipIdentifier } from "../../core/index.js"
import type { SuggestionWithScore } from "../../core/types/domain.js"
import type { BaseESLintNode } from "../../core/types/eslint-nodes.js"
import type { TypeScriptServiceError } from "../effects/errors.js"
import type { TypeScriptCompilerService } from "../services/typescript-compiler.js"
import { TypeScriptCompilerServiceTag } from "../services/typescript-compiler.js"
import { enrichSuggestionsWithSignaturesEffect } from "./suggestion-signatures.js"

export interface BaseValidationConfig<TResult> {
  readonly makeValidResult: () => TResult
  readonly makeInvalidResult: (
    name: string,
    modulePath: string,
    suggestions: ReadonlyArray<SuggestionWithScore>,
    node: BaseESLintNode,
    typeName?: string
  ) => TResult
  readonly isValidCandidate: (candidate: string, userInput: string) => boolean
}

export const isValidNamedCandidate = (
  candidate: string,
  userInput: string,
  excludeDefault: boolean
): boolean => {
  if (candidate.startsWith("__")) return false
  if (candidate.startsWith("_")) return false
  if (candidate.length === 0) return false
  if (candidate === userInput) return false
  if (excludeDefault && candidate === "default") return false
  return true
}

export const isValidImportCandidate = (
  candidate: string,
  userInput: string
): boolean => isValidNamedCandidate(candidate, userInput, false)

export const isValidExportCandidate = (
  candidate: string,
  userInput: string
): boolean => isValidNamedCandidate(candidate, userInput, true)

const enrichExportSuggestionsEffect = (
  suggestions: ReadonlyArray<SuggestionWithScore>,
  modulePath: string,
  containingFilePath: string,
  tsService: TypeScriptCompilerService
): Effect.Effect<ReadonlyArray<SuggestionWithScore>, TypeScriptServiceError> =>
  enrichSuggestionsWithSignaturesEffect(
    suggestions,
    (name) => tsService.getExportTypeSignature(modulePath, name, containingFilePath)
  )

interface InvalidResultEffectParams<TResult> {
  readonly name: string
  readonly modulePath: string
  readonly node: BaseESLintNode
  readonly typeName?: string
  readonly containingFilePath: string
  readonly validCandidates: ReadonlyArray<string>
  readonly config: BaseValidationConfig<TResult>
  readonly tsService: TypeScriptCompilerService
}

const resolveModuleTypeNameEffect = (
  tsService: TypeScriptCompilerService,
  modulePath: string,
  containingFilePath: string
): Effect.Effect<string | undefined, TypeScriptServiceError> =>
  pipe(
    tsService.getModuleTypeName(modulePath, containingFilePath),
    Effect.catchAll(() => Effect.sync((): string | undefined => undefined))
  )

const createInvalidParams = <TResult>(
  base: Omit<InvalidResultEffectParams<TResult>, "typeName">,
  typeName?: string
): InvalidResultEffectParams<TResult> =>
  typeName && typeName.length > 0
    ? { ...base, typeName }
    : base

const buildInvalidResultEffect = <TResult>(
  params: InvalidResultEffectParams<TResult>
): Effect.Effect<TResult, TypeScriptServiceError> =>
  pipe(
    findSimilarCandidatesEffect(params.name, params.validCandidates),
    Effect.flatMap((suggestions) =>
      suggestions.length === 0
        ? Effect.succeed(params.config.makeValidResult())
        : pipe(
          enrichExportSuggestionsEffect(
            suggestions,
            params.modulePath,
            params.containingFilePath,
            params.tsService
          ),
          Effect.map((enriched) =>
            params.config.makeInvalidResult(
              params.name,
              params.modulePath,
              enriched,
              params.node,
              params.typeName
            )
          )
        )
    )
  )

export const baseValidationEffect = <TResult>(
  node: BaseESLintNode,
  name: string,
  modulePath: string,
  containingFilePath: string,
  config: BaseValidationConfig<TResult>
): Effect.Effect<TResult, TypeScriptServiceError, TypeScriptCompilerServiceTag> =>
  pipe(
    Effect.gen(function*(_) {
      if (isTypeOnlyImport(node)) {
        return config.makeValidResult()
      }

      if (shouldSkipIdentifier(name)) {
        return config.makeValidResult()
      }

      const tsService = yield* _(TypeScriptCompilerServiceTag)
      const typeName = yield* _(resolveModuleTypeNameEffect(tsService, modulePath, containingFilePath))
      const availableExports = yield* _(
        tsService.getExportsOfModule(modulePath, containingFilePath)
      )

      if (availableExports.includes(name)) {
        return config.makeValidResult()
      }

      const validCandidates = availableExports.filter((candidate) => config.isValidCandidate(candidate, name))

      const invalidParams = createInvalidParams(
        {
          name,
          modulePath,
          node,
          containingFilePath,
          validCandidates,
          config,
          tsService
        },
        typeName
      )

      return yield* _(buildInvalidResultEffect(invalidParams))
    })
  )
