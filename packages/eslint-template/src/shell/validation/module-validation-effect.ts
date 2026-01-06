// CHANGE: module path validation (Effect)
// WHY: suggest similar paths for missing modules
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<ModulePathValidationResult, FilesystemError, FilesystemServiceTag>
// INVARIANT: Valid | ModuleNotFound
// COMPLEXITY: O(n log n)/O(n)
import { Effect, Match, pipe } from "effect"

import * as S from "@effect/schema/Schema"

import type { ModulePathValidationResult, SuggestionWithScore } from "../../core/index.js"
import {
  extractModuleName,
  findSimilarCandidatesEffect,
  formatModuleMessage,
  isModulePath,
  isValidCandidate,
  makeModuleNotFoundResult,
  makeValidModuleResult
} from "../../core/index.js"
import type { FilesystemError } from "../effects/errors.js"
import { makeReadError } from "../effects/errors.js"
import type { FilesystemService } from "../services/filesystem.js"
import { FilesystemServiceTag } from "../services/filesystem.js"
import { isNodeBuiltinModule } from "../services/node-builtin-exports.js"
import { MODULE_FILE_EXTENSIONS, normalizeModuleSpecifier, stripKnownExtension } from "../shared/module-path-utils.js"

const checkFileExistsWithExtensions = (
  fsService: {
    fileExists: (value: string) => Effect.Effect<boolean, FilesystemError>
  },
  pathGenerator: (ext: string) => string
): Effect.Effect<boolean, FilesystemError> =>
  Effect.gen(function*(_) {
    for (const ext of MODULE_FILE_EXTENSIONS) {
      const exists = yield* _(fsService.fileExists(pathGenerator(ext)))
      if (exists) return true
    }
    return false
  })

const checkPathWithExtensions = (
  fsService: {
    fileExists: (value: string) => Effect.Effect<boolean, FilesystemError>
  },
  basePath: string
): Effect.Effect<boolean, FilesystemError> => checkFileExistsWithExtensions(fsService, (ext) => basePath + ext)

const checkIndexFiles = (
  fsService: Pick<FilesystemService, "fileExists" | "joinPath">,
  dirPath: string
): Effect.Effect<boolean, FilesystemError> =>
  checkFileExistsWithExtensions(fsService, (ext) => fsService.joinPath(dirPath, `index${ext}`))

const generateModuleSuggestions = (
  fsService: Pick<
    FilesystemService,
    "readDirectory" | "dirname" | "joinPath" | "relativePath"
  >,
  resolvedPath: string,
  requestedPath: string,
  containingFile: string
): Effect.Effect<ReadonlyArray<SuggestionWithScore>, FilesystemError> =>
  Effect.gen(function*(_) {
    const targetDirectory = fsService.dirname(resolvedPath)
    const containingDir = fsService.dirname(containingFile)
    const normalizedRequested = requestedPath.replaceAll("\\", "/")
    const files = yield* _(fsService.readDirectory(targetDirectory))

    const moduleNames = files
      .filter((file) => /\.(ts|tsx|js|jsx|json)$/.test(file))
      .map((file) => {
        const absoluteCandidate = fsService.joinPath(targetDirectory, file)
        const withoutExtension = stripKnownExtension(absoluteCandidate)
        return normalizeModuleSpecifier(fsService.relativePath, containingDir, withoutExtension)
      })

    const uniqueCandidates = [...new Set(moduleNames)]
    const validCandidates = uniqueCandidates.filter((candidate) =>
      isValidModuleCandidate(candidate, normalizedRequested)
    )

    return yield* _(findSimilarCandidatesEffect(normalizedRequested, validCandidates))
  })

const isRelativeModuleSpecifier = (value: string): boolean =>
  value.startsWith("./") || value.startsWith("../") || value.startsWith("/")

const isNodeProtocolSpecifier = (value: string): boolean => value.startsWith("node:")

const isPackageSpecifier = (value: string): boolean =>
  !isRelativeModuleSpecifier(value) && !isNodeProtocolSpecifier(value)

const PackageJsonSchema = S.Struct({
  dependencies: S.Record({ key: S.String, value: S.String }),
  devDependencies: S.Record({ key: S.String, value: S.String }),
  peerDependencies: S.Record({ key: S.String, value: S.String }),
  optionalDependencies: S.Record({ key: S.String, value: S.String })
}).pipe(S.partial)

type PackageJson = S.Schema.Type<typeof PackageJsonSchema>

const decodePackageJson = S.decodeUnknownSync(S.parseJson(PackageJsonSchema))

const dependencySections: ReadonlyArray<keyof PackageJson> = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies"
]

const extractDependencyKeys = (
  value: Readonly<Record<string, string>> | undefined
): ReadonlyArray<string> => (value ? Object.keys(value) : [])

const mergeUnique = (
  chunks: ReadonlyArray<ReadonlyArray<string>>
): ReadonlyArray<string> => {
  const unique = new Set<string>()
  for (const chunk of chunks) {
    for (const name of chunk) {
      if (name.length > 0) {
        unique.add(name)
      }
    }
  }
  return [...unique]
}

const extractPackageNames = (value: PackageJson): ReadonlyArray<string> => {
  const chunks = dependencySections.map((section) => extractDependencyKeys(value[section]))
  return mergeUnique(chunks)
}

const parsePackageJsonEffect = (
  filePath: string,
  content: string
): Effect.Effect<PackageJson, FilesystemError> =>
  Effect.try({
    try: (): PackageJson => decodePackageJson(content),
    catch: (error) =>
      makeReadError(
        filePath,
        error instanceof Error ? error.message : "package-json-parse-error"
      )
  })

const findNearestPackageJsonEffect = (
  fsService: Pick<FilesystemService, "fileExists" | "dirname" | "joinPath">,
  containingFile: string
): Effect.Effect<string | undefined, FilesystemError> =>
  Effect.gen(function*(_) {
    let currentDir = fsService.dirname(containingFile)
    let parentDir = fsService.dirname(currentDir)
    let found: string | undefined

    while (currentDir !== parentDir && found === undefined) {
      const candidate = fsService.joinPath(currentDir, "package.json")
      const exists = yield* _(fsService.fileExists(candidate))
      if (exists) {
        found = candidate
      } else {
        currentDir = parentDir
        parentDir = fsService.dirname(currentDir)
      }
    }
    return found
  })

type PackageFsService = Pick<FilesystemService, "fileExists" | "readFile" | "dirname" | "joinPath">

const getPackageCandidatesEffect = (
  fsService: PackageFsService,
  containingFile: string
): Effect.Effect<ReadonlyArray<string>, FilesystemError> =>
  Effect.gen(function*(_) {
    const packageJsonPath = yield* _(findNearestPackageJsonEffect(fsService, containingFile))
    if (!packageJsonPath) return []
    const content = yield* _(fsService.readFile(packageJsonPath))
    const parsed = yield* _(parsePackageJsonEffect(packageJsonPath, content))
    return extractPackageNames(parsed)
  })

const validatePackageModulePathEffect = (
  fsService: PackageFsService,
  requestedPath: string,
  containingFile: string,
  node: object
): Effect.Effect<ModulePathValidationResult, FilesystemError> =>
  Effect.gen(function*(_) {
    const moduleName = extractModuleName(requestedPath)
    if (moduleName.length === 0) return makeValidModuleResult()
    if (isNodeBuiltinModule(moduleName)) return makeValidModuleResult()

    const candidates = yield* _(getPackageCandidatesEffect(fsService, containingFile))
    if (candidates.includes(moduleName)) return makeValidModuleResult()

    const validCandidates = candidates.filter((candidate) => isValidCandidate(candidate, moduleName))
    const suggestions = yield* _(findSimilarCandidatesEffect(moduleName, validCandidates))

    if (suggestions.length === 0) {
      return makeValidModuleResult()
    }

    return makeModuleNotFoundResult(requestedPath, suggestions, node, true)
  })

const validateRelativeModulePathEffect = (
  fsService: Pick<
    FilesystemService,
    "fileExists" | "readDirectory" | "resolveRelativePath" | "joinPath" | "dirname" | "relativePath"
  >,
  node: object,
  requestedPath: string,
  containingFile: string
): Effect.Effect<ModulePathValidationResult, FilesystemError> =>
  Effect.gen(function*(_) {
    const resolvedPath = yield* _(
      fsService.resolveRelativePath(containingFile, requestedPath)
    )
    const resolvedWithoutExtension = stripKnownExtension(resolvedPath)

    const pathExists = yield* _(fsService.fileExists(resolvedPath))
    if (pathExists) return makeValidModuleResult()

    const existsWithExt = yield* _(
      checkPathWithExtensions(fsService, resolvedWithoutExtension)
    )
    if (existsWithExt) return makeValidModuleResult()

    const hasIndexFiles = yield* _(
      checkIndexFiles(fsService, resolvedWithoutExtension)
    )
    if (hasIndexFiles) return makeValidModuleResult()

    const suggestions = yield* _(
      generateModuleSuggestions(fsService, resolvedPath, requestedPath, containingFile)
    )

    if (suggestions.length === 0) {
      return makeValidModuleResult()
    }

    return makeModuleNotFoundResult(requestedPath, suggestions, node)
  })

export const validateModulePathEffect = (
  node: object,
  requestedPath: string,
  containingFile: string
): Effect.Effect<
  ModulePathValidationResult,
  FilesystemError,
  FilesystemServiceTag
> =>
  pipe(
    Effect.gen(function*(_) {
      if (!isModulePath(requestedPath)) {
        return makeValidModuleResult()
      }

      const fsService = yield* _(FilesystemServiceTag)

      if (isNodeProtocolSpecifier(requestedPath)) {
        return makeValidModuleResult()
      }

      if (isNodeBuiltinModule(requestedPath)) {
        return makeValidModuleResult()
      }

      if (isPackageSpecifier(requestedPath)) {
        return yield* _(
          validatePackageModulePathEffect(
            fsService,
            requestedPath,
            containingFile,
            node
          )
        )
      }

      return yield* _(
        validateRelativeModulePathEffect(
          fsService,
          node,
          requestedPath,
          containingFile
        )
      )
    })
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
