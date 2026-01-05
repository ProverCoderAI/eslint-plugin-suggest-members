// CHANGE: member access validation (Effect)
// WHY: combine CORE predicates with TS services
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<MemberValidationResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
// INVARIANT: Valid | InvalidMember
// COMPLEXITY: O(n log n)/O(n)
import { Effect, Match, pipe } from "effect"
import type * as ts from "typescript"

import type { MemberValidationResult } from "../../core/index.js"
import {
  extractPropertyName,
  findSimilarCandidatesEffect,
  formatMemberMessage,
  makeInvalidMemberResult,
  makeValidResult,
  shouldSkipMemberExpression
} from "../../core/index.js"
import type { SuggestionWithScore } from "../../core/types/domain.js"
import type { BaseESLintNode } from "../../core/types/eslint-nodes.js"
import type { TypeScriptServiceError } from "../effects/errors.js"
import { type TypeScriptCompilerService, TypeScriptCompilerServiceTag } from "../services/typescript-compiler.js"
import { enrichSuggestionsWithSymbolMapEffect } from "./suggestion-signatures.js"

type MemberPropertyService = Pick<
  TypeScriptCompilerService,
  "getTypeAtLocation" | "getTypeName" | "getPropertiesOfType"
>

type MemberSignatureService =
  & MemberPropertyService
  & Pick<TypeScriptCompilerService, "getSymbolTypeSignature">

interface PropertyMetadata {
  readonly names: ReadonlyArray<string>
  readonly symbols: ReadonlyMap<string, ts.Symbol>
  readonly typeName?: string
}

const collectPropertyMetadata = (
  tsNode: ts.Node,
  tsService: MemberPropertyService
): Effect.Effect<PropertyMetadata, TypeScriptServiceError> =>
  Effect.gen(function*(_) {
    const objectType = yield* _(tsService.getTypeAtLocation(tsNode))
    const typeName = yield* _(
      pipe(
        tsService.getTypeName(objectType, tsNode),
        Effect.catchAll(() => Effect.sync((): string | undefined => undefined))
      )
    )
    const properties = yield* _(tsService.getPropertiesOfType(objectType))

    const names = properties.map((prop) => prop.getName())
    const symbols = new Map<string, ts.Symbol>()
    for (const symbol of properties) {
      symbols.set(symbol.getName(), symbol)
    }

    return typeName && typeName.length > 0
      ? { names, symbols, typeName }
      : { names, symbols }
  })

const enrichMemberSuggestionsEffect = (
  suggestions: ReadonlyArray<SuggestionWithScore>,
  metadata: PropertyMetadata,
  tsNode: ts.Node | undefined,
  tsService: MemberSignatureService
): Effect.Effect<ReadonlyArray<SuggestionWithScore>, TypeScriptServiceError> =>
  enrichSuggestionsWithSymbolMapEffect(
    suggestions,
    metadata.symbols,
    tsNode,
    tsService.getSymbolTypeSignature
  )

const buildMemberValidationEffect = (
  propertyName: string,
  esTreeNode: BaseESLintNode,
  tsNode: ts.Node,
  tsService: MemberSignatureService
): Effect.Effect<MemberValidationResult, TypeScriptServiceError> =>
  pipe(
    collectPropertyMetadata(tsNode, tsService),
    Effect.flatMap((metadata) => {
      if (metadata.names.includes(propertyName)) {
        return Effect.succeed(makeValidResult())
      }

      return pipe(
        findSimilarCandidatesEffect(propertyName, metadata.names),
        Effect.flatMap((suggestions) =>
          suggestions.length === 0
            ? Effect.succeed(makeValidResult())
            : pipe(
              enrichMemberSuggestionsEffect(
                suggestions,
                metadata,
                tsNode,
                tsService
              ),
              Effect.map((enriched) => makeInvalidMemberResult(propertyName, enriched, esTreeNode, metadata.typeName))
            )
        )
      )
    })
  )

interface MemberValidationParams {
  readonly propertyName: string
  readonly esTreeNode: BaseESLintNode
  readonly tsNode: ts.Node
  readonly skipValidation: boolean
}

const validateMemberPropertyNameEffectBase = (
  params: MemberValidationParams
): Effect.Effect<
  MemberValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
> =>
  pipe(
    Effect.gen(function*(_) {
      if (params.skipValidation) {
        return makeValidResult()
      }

      if (params.propertyName.length === 0) {
        return makeValidResult()
      }

      const tsService = yield* _(TypeScriptCompilerServiceTag)
      return yield* _(
        buildMemberValidationEffect(
          params.propertyName,
          params.esTreeNode,
          params.tsNode,
          tsService
        )
      )
    })
  )

export const validateMemberAccessEffectWithNodes = (
  esTreeNode: BaseESLintNode,
  tsNode: ts.Node
): Effect.Effect<
  MemberValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
> =>
  validateMemberPropertyNameEffectBase({
    propertyName: extractPropertyName(esTreeNode),
    esTreeNode,
    tsNode,
    skipValidation: shouldSkipMemberExpression(esTreeNode)
  })

export const validateMemberPropertyNameEffect = (
  propertyName: string,
  esTreeNode: BaseESLintNode,
  tsNode: ts.Node
): Effect.Effect<
  MemberValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
> =>
  validateMemberPropertyNameEffectBase({
    propertyName,
    esTreeNode,
    tsNode,
    skipValidation: false
  })

export const formatMemberValidationMessage = (
  result: MemberValidationResult
): string =>
  Match.value(result).pipe(
    Match.when({ _tag: "Valid" }, () => ""),
    Match.when({ _tag: "InvalidMember" }, (invalid) =>
      formatMemberMessage(invalid.propertyName, invalid.typeName, invalid.suggestions)),
    Match.exhaustive
  )
