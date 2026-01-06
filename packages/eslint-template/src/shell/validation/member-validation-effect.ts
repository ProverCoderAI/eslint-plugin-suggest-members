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
import * as ts from "typescript"

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

type MemberMetadataService = Pick<
  TypeScriptCompilerService,
  "getTypeName" | "getPropertiesOfType"
>

type MemberPropertyService =
  & MemberMetadataService
  & Pick<TypeScriptCompilerService, "getTypeAtLocation">

type MemberContextualService =
  & MemberMetadataService
  & Pick<TypeScriptCompilerService, "getContextualType">

type MemberSignatureService =
  & MemberMetadataService
  & Pick<TypeScriptCompilerService, "getSymbolTypeSignature">

type MemberNodeService = MemberPropertyService & MemberSignatureService

interface PropertyMetadata {
  readonly names: ReadonlyArray<string>
  readonly symbols: ReadonlyMap<string, ts.Symbol>
  readonly typeName?: string
}

const collectUnionPropertiesEffect = (
  objectType: ts.Type,
  tsService: MemberMetadataService
): Effect.Effect<ReadonlyArray<ts.Symbol>, TypeScriptServiceError> =>
  Effect.gen(function*(_) {
    if (!objectType.isUnion()) {
      return yield* _(tsService.getPropertiesOfType(objectType))
    }

    const emptySymbols: ReadonlyArray<ts.Symbol> = []
    const properties: Array<ts.Symbol> = []
    for (const part of objectType.types) {
      const partProps = yield* _(
        pipe(
          tsService.getPropertiesOfType(part),
          Effect.matchEffect({
            onFailure: () => Effect.succeed(emptySymbols),
            onSuccess: (value) => Effect.succeed(value)
          })
        )
      )
      for (const prop of partProps) {
        properties.push(prop)
      }
    }

    return properties
  })

const collectPropertyMetadataForType = (
  objectType: ts.Type,
  tsNode: ts.Node,
  tsService: MemberMetadataService
): Effect.Effect<PropertyMetadata, TypeScriptServiceError> =>
  Effect.gen(function*(_) {
    const typeName = yield* _(
      pipe(
        tsService.getTypeName(objectType, tsNode),
        Effect.matchEffect({
          onFailure: () => Effect.succeed(undefined),
          onSuccess: (value) => Effect.succeed(value)
        })
      )
    )
    const properties = yield* _(collectUnionPropertiesEffect(objectType, tsService))

    const names: Array<string> = []
    const symbols = new Map<string, ts.Symbol>()
    for (const symbol of properties) {
      const name = symbol.getName()
      if (!symbols.has(name)) {
        names.push(name)
        symbols.set(name, symbol)
      }
    }

    return typeName && typeName.length > 0
      ? { names, symbols, typeName }
      : { names, symbols }
  })

const collectPropertyMetadata = (
  tsNode: ts.Node,
  tsService: MemberPropertyService
): Effect.Effect<PropertyMetadata, TypeScriptServiceError> =>
  pipe(
    tsService.getTypeAtLocation(tsNode),
    Effect.flatMap((objectType) => collectPropertyMetadataForType(objectType, tsNode, tsService))
  )

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

const buildMemberValidationEffectWithMetadata = (
  propertyName: string,
  esTreeNode: BaseESLintNode,
  tsNode: ts.Node,
  tsService: MemberSignatureService,
  metadata: PropertyMetadata
): Effect.Effect<MemberValidationResult, TypeScriptServiceError> =>
  metadata.names.includes(propertyName)
    ? Effect.succeed(makeValidResult())
    : pipe(
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

const buildMemberValidationEffect = (
  propertyName: string,
  esTreeNode: BaseESLintNode,
  tsNode: ts.Node,
  tsService: MemberNodeService
): Effect.Effect<MemberValidationResult, TypeScriptServiceError> =>
  pipe(
    collectPropertyMetadata(tsNode, tsService),
    Effect.flatMap((metadata) =>
      buildMemberValidationEffectWithMetadata(
        propertyName,
        esTreeNode,
        tsNode,
        tsService,
        metadata
      )
    )
  )

const buildMemberValidationEffectFromContextualType = (
  propertyName: string,
  esTreeNode: BaseESLintNode,
  tsNode: ts.Expression,
  tsService: MemberContextualService & MemberSignatureService
): Effect.Effect<MemberValidationResult, TypeScriptServiceError> =>
  pipe(
    tsService.getContextualType(tsNode),
    Effect.flatMap((contextualType) =>
      contextualType
        ? pipe(
          collectPropertyMetadataForType(contextualType, tsNode, tsService),
          Effect.flatMap((metadata) =>
            buildMemberValidationEffectWithMetadata(
              propertyName,
              esTreeNode,
              tsNode,
              tsService,
              metadata
            )
          )
        )
        : Effect.succeed(makeValidResult())
    )
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

export const validateObjectLiteralPropertyNameEffect = (
  propertyName: string,
  esTreeNode: BaseESLintNode,
  tsNode: ts.Node
): Effect.Effect<
  MemberValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
> =>
  pipe(
    Effect.gen(function*(_) {
      if (propertyName.length === 0) {
        return makeValidResult()
      }

      const tsService = yield* _(TypeScriptCompilerServiceTag)
      if (!ts.isExpression(tsNode)) {
        return makeValidResult()
      }
      return yield* _(
        buildMemberValidationEffectFromContextualType(
          propertyName,
          esTreeNode,
          tsNode,
          tsService
        )
      )
    })
  )

export const formatMemberValidationMessage = (
  result: MemberValidationResult
): string =>
  Match.value(result).pipe(
    Match.when({ _tag: "Valid" }, () => ""),
    Match.when({ _tag: "InvalidMember" }, (invalid) =>
      formatMemberMessage(invalid.propertyName, invalid.typeName, invalid.suggestions)),
    Match.exhaustive
  )
