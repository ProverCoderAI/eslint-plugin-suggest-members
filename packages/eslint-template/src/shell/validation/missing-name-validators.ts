// CHANGE: missing name validators
// WHY: share configuration for missing-name and local-export checks
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<MissingNameValidationResult, TypeScriptServiceError, TypeScriptCompilerServiceTag>
// INVARIANT: Valid | MissingName
// COMPLEXITY: O(n log n)/O(n)
import type { Effect } from "effect"
import * as ts from "typescript"

import type { TSESTree } from "@typescript-eslint/utils"
import type { MissingNameValidationResult } from "../../core/index.js"
import type { TypeScriptServiceError } from "../effects/errors.js"
import type { TypeScriptCompilerServiceTag } from "../services/typescript-compiler.js"
import {
  type MissingNameValidationConfig,
  validateMissingNameIdentifierEffectBase
} from "./missing-name-validation-base.js"

const missingNameConfig: MissingNameValidationConfig = {
  symbolFlags: ts.SymbolFlags.Value | ts.SymbolFlags.Alias,
  skipWhenNoSuggestions: true
}

const localExportConfig: MissingNameValidationConfig = {
  symbolFlags: ts.SymbolFlags.Value |
    ts.SymbolFlags.Type |
    ts.SymbolFlags.Namespace |
    ts.SymbolFlags.Module,
  skipWhenNoSuggestions: false
}

const createMissingNameValidator = (config: MissingNameValidationConfig) =>
(
  identifier: TSESTree.Identifier,
  tsNode: ts.Node
): Effect.Effect<
  MissingNameValidationResult,
  TypeScriptServiceError,
  TypeScriptCompilerServiceTag
> => validateMissingNameIdentifierEffectBase(identifier, tsNode, config)

export const validateMissingNameIdentifierEffect = createMissingNameValidator(missingNameConfig)

export const validateLocalExportIdentifierEffect = createMissingNameValidator(localExportConfig)

export {
  formatMissingNameValidationMessage,
  formatMissingNameValidationMessage as formatLocalExportValidationMessage
} from "./missing-name-validation-base.js"
