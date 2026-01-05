// CHANGE: suggestion message formatting
// WHY: consistent diagnostics
// QUOTE(TZ): "multi-line format" | n/a
// REF: AGENTS.md formatting
// SOURCE: n/a
// FORMAT THEOREM: message ∈ String
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: suggestions capped
// COMPLEXITY: O(n)/O(1)
import { Match } from "effect"

import type { SuggestionWithScore } from "../types/domain.js"
import { MAX_SUGGESTIONS } from "../types/domain.js"

interface DepthState {
  readonly paren: number
  readonly bracket: number
  readonly brace: number
  readonly angle: number
}

const initialDepthState: DepthState = {
  paren: 0,
  bracket: 0,
  brace: 0,
  angle: 0
}

const isTopLevel = (state: DepthState): boolean =>
  state.paren === 0 &&
  state.bracket === 0 &&
  state.brace === 0 &&
  state.angle === 0

const updateDepthState = (
  state: DepthState,
  char: string,
  prev: string
): DepthState =>
  Match.value(char).pipe(
    Match.when("(", () => ({ ...state, paren: state.paren + 1 })),
    Match.when(")", () => ({ ...state, paren: Math.max(0, state.paren - 1) })),
    Match.when("[", () => ({ ...state, bracket: state.bracket + 1 })),
    Match.when("]", () => ({ ...state, bracket: Math.max(0, state.bracket - 1) })),
    Match.when("{", () => ({ ...state, brace: state.brace + 1 })),
    Match.when("}", () => ({ ...state, brace: Math.max(0, state.brace - 1) })),
    Match.when("<", () => ({ ...state, angle: state.angle + 1 })),
    Match.when(">", () => prev === "=" ? state : ({ ...state, angle: Math.max(0, state.angle - 1) })),
    Match.orElse(() => state)
  )

interface SegmentState {
  readonly segments: ReadonlyArray<string>
  readonly current: string
  readonly depthState: DepthState
}

const initialSegmentState: SegmentState = {
  segments: [],
  current: "",
  depthState: initialDepthState
}

const shouldSplitSegment = (char: string, depthState: DepthState): boolean => char === ";" && isTopLevel(depthState)

const resetCurrent = (state: SegmentState): SegmentState => ({
  ...state,
  current: ""
})

const appendSegment = (state: SegmentState): SegmentState => ({
  ...state,
  segments: [...state.segments, state.current],
  current: ""
})

const appendChar = (
  state: SegmentState,
  char: string,
  prev: string
): SegmentState => ({
  ...state,
  current: state.current + char,
  depthState: updateDepthState(state.depthState, char, prev)
})

const handleChar = (
  state: SegmentState,
  char: string,
  prev: string
): SegmentState => {
  if (!shouldSplitSegment(char, state.depthState)) {
    return appendChar(state, char, prev)
  }

  return state.current.trim().length > 0 ? appendSegment(state) : resetCurrent(state)
}

const finalizeSegments = (state: SegmentState): ReadonlyArray<string> =>
  state.current.trim().length > 0
    ? [...state.segments, state.current]
    : state.segments

const splitTopLevelSegments = (input: string): ReadonlyArray<string> => {
  let state = initialSegmentState

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? ""
    const prev = index > 0 ? input[index - 1] ?? "" : ""
    state = handleChar(state, char, prev)
  }

  return finalizeSegments(state)
}

const formatSingleSignature = (name: string, signature: string): string => {
  const trimmed = signature.trim()
  const arrowMatch = /^\((.*)\) => (.*)$/.exec(trimmed)
  if (arrowMatch && arrowMatch[1] !== undefined && arrowMatch[2] !== undefined) {
    return `${name}(${arrowMatch[1]}): ${arrowMatch[2]}`
  }

  if (trimmed.startsWith(`${name}(`) || trimmed.startsWith(`${name}<`)) {
    return trimmed
  }

  if (trimmed.startsWith("<") || trimmed.startsWith("(")) {
    return `${name}${trimmed}`
  }

  return `${name}: ${trimmed}`
}

const isAngleOpen = (char: string): boolean => char === "<"

const isAngleClose = (char: string, prev: string): boolean => char === ">" && prev !== "="

const nextAngleDepth = (depth: number, char: string, prev: string): number => {
  if (isAngleOpen(char)) {
    return depth + 1
  }
  if (isAngleClose(char, prev)) {
    return Math.max(0, depth - 1)
  }
  return depth
}

const shouldCloseAngle = (depth: number, char: string, prev: string): boolean => {
  if (depth <= 0) return false
  if (!isAngleClose(char, prev)) return false
  return nextAngleDepth(depth, char, prev) === 0
}

const extractAngleSegment = (value: string): string | undefined => {
  if (!value.startsWith("<")) return undefined
  let depth = 0
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? ""
    const prev = index > 0 ? value[index - 1] ?? "" : ""
    if (shouldCloseAngle(depth, char, prev)) {
      return value.slice(0, index + 1)
    }
    depth = nextAngleDepth(depth, char, prev)
  }

  return undefined
}

const formatOverloadLabel = (name: string, signature: string): string => {
  const trimmed = signature.trim()
  const withoutName = trimmed.startsWith(name)
    ? trimmed.slice(name.length).trimStart()
    : trimmed
  const generic = extractAngleSegment(withoutName)
  return generic ? `${name}${generic}` : name
}

const formatSignatureLines = (name: string, signature: string): ReadonlyArray<string> => {
  const trimmed = signature.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim()
    const segments = splitTopLevelSegments(inner)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)

    if (segments.length > 1) {
      return segments.map((segment) => formatOverloadLabel(name, segment))
    }
  }

  return [formatSingleSignature(name, signature)]
}

const formatSuggestionLines = (
  suggestion: SuggestionWithScore,
  includeSignatures: boolean
): ReadonlyArray<string> => {
  if (includeSignatures && suggestion.signature !== undefined) {
    return formatSignatureLines(suggestion.name, suggestion.signature)
  }
  return [suggestion.name]
}

const formatSuggestionList = (
  suggestions: ReadonlyArray<SuggestionWithScore>,
  includeSignatures: boolean
): string => {
  const top = suggestions.slice(0, MAX_SUGGESTIONS)
  return top
    .flatMap((suggestion) =>
      formatSuggestionLines(suggestion, includeSignatures).map(
        (line) => `  - ${line}`
      )
    )
    .join("\n")
}

const formatWithSuggestions = (
  header: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  includeSignatures: boolean
): string =>
  suggestions.length === 0
    ? header
    : `${header} Did you mean:\n${formatSuggestionList(suggestions, includeSignatures)}`

const formatExportContextMessage = (
  label: string,
  name: string,
  modulePath: string,
  typeName: string | undefined,
  suggestions: ReadonlyArray<SuggestionWithScore>
): string => {
  const typeContext = typeName && typeName.length > 0 ? ` on type '${typeName}'` : ` in module '${modulePath}'`
  const header = `${label} '${name}' does not exist${typeContext}.`
  return formatWithSuggestions(header, suggestions, true)
}

export const formatSuggestionMessage = (
  suggestions: ReadonlyArray<SuggestionWithScore>
): string => {
  if (suggestions.length === 0) {
    return "No similar suggestions found."
  }

  return `Did you mean:\n${formatSuggestionList(suggestions, false)}`
}

export const formatMemberMessage = (
  propertyName: string,
  typeName: string | undefined,
  suggestions: ReadonlyArray<SuggestionWithScore>
): string => {
  const typeContext = typeName && typeName.length > 0 ? ` on type '${typeName}'` : ""
  const header = `Property '${propertyName}' does not exist${typeContext}.`
  return formatWithSuggestions(header, suggestions, true)
}

export const formatImportMessage = (
  importName: string,
  modulePath: string,
  typeName: string | undefined,
  suggestions: ReadonlyArray<SuggestionWithScore>
): string =>
  formatExportContextMessage(
    "Export",
    importName,
    modulePath,
    typeName,
    suggestions
  )

export const formatExportMessage = (
  exportName: string,
  modulePath: string,
  typeName: string | undefined,
  suggestions: ReadonlyArray<SuggestionWithScore>
): string =>
  formatExportContextMessage(
    "Export",
    exportName,
    modulePath,
    typeName,
    suggestions
  )

export const formatModuleMessage = (
  requestedPath: string,
  suggestions: ReadonlyArray<SuggestionWithScore>,
  includeTypeDeclarations = false
): string => {
  const suffix = includeTypeDeclarations ? " or its corresponding type declarations" : ""
  const quote = includeTypeDeclarations ? "'" : "\""
  const prefix = `Cannot find module ${quote}${requestedPath}${quote}${suffix}. Did you mean`
  return `${prefix}:\n${formatSuggestionList(suggestions, false)}`
}

export const formatMissingNameMessage = (
  name: string,
  suggestions: ReadonlyArray<SuggestionWithScore>
): string => {
  if (suggestions.length === 0) {
    return `Cannot find name '${name}'.`
  }

  const top = suggestions.slice(0, MAX_SUGGESTIONS)
  return `Cannot find name '${name}'. Did you mean:\n${formatSuggestionList(top, true)}`
}
