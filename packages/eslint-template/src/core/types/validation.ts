// CHANGE: validation result types with tagged unions
// WHY: total error modeling + exhaustive matching
// QUOTE(TZ): n/a
// REF: AGENTS.md - typed errors
// SOURCE: n/a
// FORMAT THEOREM: Result = Valid ∪ Invalid
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: _tag discriminates union exhaustively
// COMPLEXITY: O(1)/O(1)
import type { SuggestionWithScore } from "./domain.js"

export type MemberValidationResult =
  | { readonly _tag: "Valid" }
  | {
    readonly _tag: "InvalidMember"
    readonly propertyName: string
    readonly typeName?: string
    readonly suggestions: ReadonlyArray<SuggestionWithScore>
    readonly node: object
  }

export type ImportValidationResult =
  | { readonly _tag: "Valid" }
  | {
    readonly _tag: "ImportNotFound"
    readonly importName: string
    readonly modulePath: string
    readonly typeName?: string
    readonly suggestions: ReadonlyArray<SuggestionWithScore>
    readonly node: object
  }

export type ExportValidationResult =
  | { readonly _tag: "Valid" }
  | {
    readonly _tag: "ExportNotFound"
    readonly exportName: string
    readonly modulePath: string
    readonly typeName?: string
    readonly suggestions: ReadonlyArray<SuggestionWithScore>
    readonly node: object
  }

export type ModulePathValidationResult =
  | { readonly _tag: "Valid" }
  | {
    readonly _tag: "ModuleNotFound"
    readonly requestedPath: string
    readonly includeTypeDeclarations?: boolean
    readonly suggestions: ReadonlyArray<SuggestionWithScore>
    readonly node: object
  }

export type MissingNameValidationResult =
  | { readonly _tag: "Valid" }
  | {
    readonly _tag: "MissingName"
    readonly name: string
    readonly suggestions: ReadonlyArray<SuggestionWithScore>
    readonly node: object
  }

export const makeValidResult = (): MemberValidationResult => ({ _tag: "Valid" })

export const makeValidMemberResult = (): MemberValidationResult => ({
  _tag: "Valid"
})

export const makeValidImportResult = (): ImportValidationResult => ({
  _tag: "Valid"
})

export const makeValidExportResult = (): ExportValidationResult => ({
  _tag: "Valid"
})

export const makeValidModuleResult = (): ModulePathValidationResult => ({
  _tag: "Valid"
})

export const makeValidMissingNameResult = (): MissingNameValidationResult => ({
  _tag: "Valid"
})

export const makeInvalidMemberResult = (
  propertyName: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  node: object,
  typeName?: string
): MemberValidationResult =>
  typeName && typeName.length > 0
    ? {
      _tag: "InvalidMember",
      propertyName,
      typeName,
      suggestions,
      node
    }
    : {
      _tag: "InvalidMember",
      propertyName,
      suggestions,
      node
    }

export const makeImportNotFoundResult = (
  importName: string,
  modulePath: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  node: object,
  typeName?: string
): ImportValidationResult =>
  typeName && typeName.length > 0
    ? {
      _tag: "ImportNotFound",
      importName,
      modulePath,
      typeName,
      suggestions,
      node
    }
    : {
      _tag: "ImportNotFound",
      importName,
      modulePath,
      suggestions,
      node
    }

export const makeExportNotFoundResult = (
  exportName: string,
  modulePath: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  node: object,
  typeName?: string
): ExportValidationResult =>
  typeName && typeName.length > 0
    ? {
      _tag: "ExportNotFound",
      exportName,
      modulePath,
      typeName,
      suggestions,
      node
    }
    : {
      _tag: "ExportNotFound",
      exportName,
      modulePath,
      suggestions,
      node
    }

export const makeModuleNotFoundResult = (
  requestedPath: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  node: object,
  includeTypeDeclarations?: boolean
): ModulePathValidationResult =>
  includeTypeDeclarations
    ? {
      _tag: "ModuleNotFound",
      requestedPath,
      includeTypeDeclarations,
      suggestions,
      node
    }
    : {
      _tag: "ModuleNotFound",
      requestedPath,
      suggestions,
      node
    }

export const makeMissingNameResult = (
  name: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  node: object
): MissingNameValidationResult => ({
  _tag: "MissingName",
  name,
  suggestions,
  node
})
