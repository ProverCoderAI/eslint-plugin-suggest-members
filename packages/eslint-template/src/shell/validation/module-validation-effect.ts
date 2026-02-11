// CHANGE: module path validation (Effect)
// WHY: suggest similar paths for missing modules
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<ModulePathValidationResult, FilesystemError>
// INVARIANT: Valid | ModuleNotFound
// COMPLEXITY: O(n log n)/O(n)
import * as NodePath from "@effect/platform-node/NodePath"
import * as Path from "@effect/platform/Path"
import { Effect, Match, pipe } from "effect"
import * as ts from "typescript"

import type { ModulePathValidationResult, SuggestionWithScore } from "../../core/index.js"
import {
  extractModuleName,
  formatModuleMessage,
  isModulePath,
  isValidCandidate,
  makeModuleNotFoundResult,
  makeValidModuleResult
} from "../../core/index.js"
import { findSimilarCandidates } from "../../core/suggestion/engine.js"
import {
  MODULE_FILE_EXTENSIONS,
  normalizeModuleSpecifier,
  stripKnownExtension
} from "../../core/validation/module-path-utils.js"
import type { FilesystemError } from "../effects/errors.js"
import { FilesystemServiceTag } from "../services/filesystem.js"
import type { ModulePathIndex } from "./module-path-index.js"

const pathService = Effect.runSync(
  Effect.provide(Effect.serviceOptional(Path.Path), NodePath.layer)
)

const normalizePath = (value: string): string => value.replaceAll("\\", "/")

const resolveRelativePath = (fromPath: string, modulePath: string): string => {
  if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
    return normalizePath(pathService.resolve(pathService.dirname(fromPath), modulePath))
  }
  if (modulePath.startsWith("/") || modulePath.startsWith("node:")) {
    return modulePath
  }
  return modulePath
}

const buildModuleCandidates = (
  index: ModulePathIndex,
  resolvedPath: string,
  requestedPath: string,
  containingFile: string
): ReadonlyArray<SuggestionWithScore> => {
  const targetDirectory = normalizePath(pathService.dirname(resolvedPath))
  const containingDir = normalizePath(pathService.dirname(containingFile))
  const normalizedRequested = normalizePath(requestedPath)

  const moduleNames = index.localFiles
    .filter((file) => normalizePath(pathService.dirname(file)) === targetDirectory)
    .map((file) => {
      const withoutExtension = stripKnownExtension(file)
      return normalizeModuleSpecifier(pathService.relative, containingDir, withoutExtension)
    })

  const uniqueCandidates = [...new Set(moduleNames)]
  const validCandidates = uniqueCandidates.filter((candidate) => isValidModuleCandidate(candidate, normalizedRequested))

  return findSimilarCandidates(normalizedRequested, validCandidates)
}

const containsFile = (index: ModulePathIndex, filePath: string): boolean =>
  index.localFileSet.has(normalizePath(filePath))

const checkPathWithExtensionsInIndex = (
  index: ModulePathIndex,
  basePath: string
): boolean => MODULE_FILE_EXTENSIONS.some((ext) => containsFile(index, basePath + ext))

const checkIndexFilesInIndex = (
  index: ModulePathIndex,
  dirPath: string
): boolean => MODULE_FILE_EXTENSIONS.some((ext) => containsFile(index, pathService.join(dirPath, `index${ext}`)))

const isRelativeModuleSpecifier = (value: string): boolean =>
  value.startsWith("./") || value.startsWith("../") || value.startsWith("/")

const isNodeProtocolSpecifier = (value: string): boolean => value.startsWith("node:")

const isPackageSpecifier = (value: string): boolean =>
  !isRelativeModuleSpecifier(value) && !isNodeProtocolSpecifier(value)

const fileExistsOnDisk = (filePath: string): boolean => ts.sys.fileExists(filePath)

// CHANGE: add containingFile parameter and TypeScript resolution fallback
// WHY: in monorepos, workspace packages may not appear in the package name index.
//   TypeScript's module resolution can validate these imports as a last resort.
// REF: issue #14 — monorepo cross-package imports produce false-positive errors
// PURITY: SHELL
// INVARIANT: Valid when package is in index OR resolvable by TypeScript
// COMPLEXITY: O(n log n)/O(n)
const validatePackageModulePathWithIndex = (
  index: ModulePathIndex,
  requestedPath: string,
  node: object,
  containingFile: string
): ModulePathValidationResult => {
  const moduleName = extractModuleName(requestedPath)
  if (moduleName.length === 0) return makeValidModuleResult()
  if (index.packageNameSet.has(moduleName)) return makeValidModuleResult()

  // fallback: check if TypeScript can resolve the module
  if (index.canResolveModule?.(requestedPath, containingFile)) {
    return makeValidModuleResult()
  }

  const validCandidates = index.packageNames.filter((candidate) => isValidCandidate(candidate, moduleName))
  const suggestions = findSimilarCandidates(moduleName, validCandidates)

  if (suggestions.length === 0) {
    return makeValidModuleResult()
  }

  return makeModuleNotFoundResult(requestedPath, suggestions, node, true)
}

const validateRelativeModulePathWithIndex = (
  index: ModulePathIndex,
  node: object,
  requestedPath: string,
  containingFile: string
): ModulePathValidationResult => {
  const resolvedPath = resolveRelativePath(containingFile, requestedPath)
  const resolvedWithoutExtension = stripKnownExtension(resolvedPath)

  // CHANGE: accept existing on-disk imports even if TS program index excludes file type
  // WHY: style/assets imports (e.g. .css) are usually not part of Program.getSourceFiles()
  //   but should not be reported as missing when file exists.
  // QUOTE(TZ): "должно не падать ... если подключаем модуль"
  // REF: user-message-2026-02-11
  // SOURCE: n/a
  // FORMAT THEOREM: ∀p ∈ RelativeImports: fileExists(p) → Valid(p)
  // PURITY: SHELL
  // INVARIANT: fallback only suppresses false positives for real files on disk
  // COMPLEXITY: O(1)/O(1)
  if (fileExistsOnDisk(resolvedPath)) return makeValidModuleResult()

  if (containsFile(index, resolvedPath)) return makeValidModuleResult()
  if (checkPathWithExtensionsInIndex(index, resolvedWithoutExtension)) return makeValidModuleResult()
  if (checkIndexFilesInIndex(index, resolvedWithoutExtension)) return makeValidModuleResult()

  const suggestions = buildModuleCandidates(index, resolvedPath, requestedPath, containingFile)

  if (suggestions.length === 0) {
    return makeValidModuleResult()
  }

  return makeModuleNotFoundResult(requestedPath, suggestions, node)
}

const validateModulePathWithIndex = (
  index: ModulePathIndex,
  node: object,
  requestedPath: string,
  containingFile: string
): ModulePathValidationResult => {
  if (!isModulePath(requestedPath)) {
    return makeValidModuleResult()
  }

  if (isNodeProtocolSpecifier(requestedPath)) {
    return makeValidModuleResult()
  }

  if (isPackageSpecifier(requestedPath)) {
    return validatePackageModulePathWithIndex(index, requestedPath, node, containingFile)
  }

  return validateRelativeModulePathWithIndex(index, node, requestedPath, containingFile)
}

export const validateModulePathEffect = (
  node: object,
  requestedPath: string,
  containingFile: string,
  moduleIndex?: ModulePathIndex
): Effect.Effect<ModulePathValidationResult, FilesystemError> =>
  Effect.succeed(
    moduleIndex
      ? validateModulePathWithIndex(
        moduleIndex,
        node,
        requestedPath,
        containingFile
      )
      : makeValidModuleResult()
  )

export const modulePathExistsEffect = (
  modulePath: string,
  containingFile: string
): Effect.Effect<boolean, FilesystemError, FilesystemServiceTag> =>
  pipe(
    Effect.gen(function*(_) {
      const fsService = yield* _(FilesystemServiceTag)
      const resolvedPath = yield* _(
        fsService.resolveRelativePath(containingFile, modulePath)
      )
      return yield* _(fsService.fileExists(resolvedPath))
    })
  )

export const isValidModuleCandidate = (
  candidate: string,
  userInput: string
): boolean => {
  if (candidate.startsWith(".") && !candidate.startsWith("./") && !candidate.startsWith("../")) {
    return false
  }
  if (candidate === userInput) return false
  if (candidate.length === 0) return false
  if (candidate.includes(".test.") || candidate.includes(".spec.")) return false
  return true
}

export const formatModulePathValidationMessage = (
  result: ModulePathValidationResult
): string =>
  Match.value(result).pipe(
    Match.when({ _tag: "Valid" }, () => ""),
    Match.when(
      { _tag: "ModuleNotFound" },
      (invalid) =>
        formatModuleMessage(
          invalid.requestedPath,
          invalid.suggestions,
          invalid.includeTypeDeclarations === true
        )
    ),
    Match.exhaustive
  )
