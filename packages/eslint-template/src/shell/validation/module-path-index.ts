// CHANGE: module path index from TypeScript program
// WHY: allow sync module-path validation without direct filesystem access
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: index contains only supported file extensions
// COMPLEXITY: O(n)/O(n)
import * as S from "@effect/schema/Schema"
import * as Either from "effect/Either"
import * as ts from "typescript"

import { SUPPORTED_EXTENSIONS } from "../../core/validation/candidates.js"

export interface ModulePathIndex {
  readonly localFiles: ReadonlyArray<string>
  readonly localFileSet: ReadonlySet<string>
  readonly packageNames: ReadonlyArray<string>
  readonly packageNameSet: ReadonlySet<string>
  readonly canResolveModule?: (modulePath: string, containingFile: string) => boolean
}

const normalizePath = (value: string): string => value.replaceAll("\\", "/")

const isSupportedFile = (filePath: string): boolean => SUPPORTED_EXTENSIONS.some((ext) => filePath.endsWith(ext))

const PackageJsonSchema = S.Struct({
  dependencies: S.Record({ key: S.String, value: S.String }),
  devDependencies: S.Record({ key: S.String, value: S.String }),
  peerDependencies: S.Record({ key: S.String, value: S.String }),
  optionalDependencies: S.Record({ key: S.String, value: S.String })
}).pipe(S.partial)

type PackageJson = S.Schema.Type<typeof PackageJsonSchema>

const decodePackageJson = S.decodeUnknownEither(S.parseJson(PackageJsonSchema))

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
  const sections: ReadonlyArray<keyof PackageJson> = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies"
  ]
  const chunks = sections.map((section) => extractDependencyKeys(value[section]))
  return mergeUnique(chunks)
}

const parsePackageJson = (content: string): PackageJson | null =>
  Either.match(decodePackageJson(content), {
    onLeft: () => null,
    onRight: (value) => value
  })

const dirname = (value: string): string => {
  const normalized = normalizePath(value)
  const lastSlash = normalized.lastIndexOf("/")
  if (lastSlash <= 0) return normalized
  return normalized.slice(0, lastSlash)
}

const joinPath = (...segments: ReadonlyArray<string>): string => normalizePath(segments.join("/"))

const findNearestPackageJson = (startDir: string): string | null => {
  let currentDir = normalizePath(startDir)
  let parentDir = dirname(currentDir)

  while (currentDir !== parentDir) {
    const candidate = joinPath(currentDir, "package.json")
    if (ts.sys.fileExists(candidate)) return candidate
    currentDir = parentDir
    parentDir = dirname(currentDir)
  }

  const rootCandidate = joinPath(currentDir, "package.json")
  return ts.sys.fileExists(rootCandidate) ? rootCandidate : null
}

// CHANGE: read package.json "name" field for workspace package discovery
// WHY: monorepo workspace packages need their names collected so cross-package imports are recognized
// PURITY: SHELL
// INVARIANT: returns name or null
// COMPLEXITY: O(1)/O(1)
const PackageNameSchema = S.Struct({
  name: S.String
}).pipe(S.partial)

const decodePackageName = S.decodeUnknownEither(S.parseJson(PackageNameSchema))

const readPackageNameFromPath = (packageJsonPath: string): string | null => {
  const content = ts.sys.readFile(packageJsonPath)
  if (!content) return null
  return Either.match(decodePackageName(content), {
    onLeft: () => null,
    onRight: (value) => value.name !== undefined && value.name.length > 0 ? value.name : null
  })
}

// CHANGE: collect unique package.json directories from source files
// WHY: in monorepos, program.getCurrentDirectory() returns the workspace root,
//   missing package-level dependencies. Source files belong to specific packages,
//   so we find their nearest package.json files for accurate dependency discovery.
// PURITY: SHELL
// INVARIANT: each unique package.json is read at most once
// COMPLEXITY: O(n)/O(n) where n = |sourceFiles|
const collectPackageJsonPaths = (
  sourceFileDirs: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const seen = new Set<string>()
  const result: Array<string> = []

  for (const dir of sourceFileDirs) {
    const found = findNearestPackageJson(dir)
    if (found && !seen.has(found)) {
      seen.add(found)
      result.push(found)
    }
  }

  return result
}

// CHANGE: discover workspace sibling package names
// WHY: in monorepos, cross-package imports reference sibling packages by name.
//   These names must be in the index to prevent false-positive "module not found" errors.
// REF: issue #14 — plugin unable to work with monorepos where one package imports from another
// PURITY: SHELL
// INVARIANT: only reads package.json files that exist on disk
// COMPLEXITY: O(w)/O(w) where w = |workspace packages|
const discoverWorkspacePackageNames = (
  packageJsonPaths: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const names: Array<string> = []
  const visitedParents = new Set<string>()

  for (const pkgPath of packageJsonPaths) {
    const pkgDir = dirname(pkgPath)
    const parentDir = dirname(pkgDir)

    if (visitedParents.has(parentDir)) continue
    visitedParents.add(parentDir)

    // use getDirectories to enumerate sibling package directories
    const subdirs = ts.sys.getDirectories(parentDir)
    for (const subdir of subdirs) {
      if (subdir === "node_modules") continue
      const sibPkgJson = joinPath(parentDir, subdir, "package.json")
      if (ts.sys.fileExists(sibPkgJson)) {
        const name = readPackageNameFromPath(sibPkgJson)
        if (name) names.push(name)
      }
    }
  }

  return names
}

// CHANGE: collect local source files and their directories from a TypeScript program
// WHY: extracted from buildModulePathIndex to reduce complexity
// PURITY: SHELL
// COMPLEXITY: O(n)/O(n) where n = |sourceFiles|
const collectSourceFilesAndDirs = (
  program: ts.Program
): { localFiles: ReadonlyArray<string>; sourceFileDirs: ReadonlySet<string> } => {
  const localFiles: Array<string> = []
  const sourceFileDirs = new Set<string>()

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue
    const normalized = normalizePath(sourceFile.fileName)
    if (normalized.includes("/node_modules/")) continue

    if (isSupportedFile(normalized)) {
      localFiles.push(normalized)
    }
    sourceFileDirs.add(dirname(normalized))
  }

  return { localFiles, sourceFileDirs }
}

// CHANGE: extract dependency names from all package.json files and workspace siblings
// WHY: extracted from buildModulePathIndex to reduce complexity
// PURITY: SHELL
// COMPLEXITY: O(n)/O(n)
const collectAllPackageNames = (
  packageJsonPaths: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const packageNames = new Set<string>()

  for (const pkgPath of packageJsonPaths) {
    const content = ts.sys.readFile(pkgPath)
    if (!content) continue
    const parsed = parsePackageJson(content)
    if (!parsed) continue
    for (const name of extractPackageNames(parsed)) {
      packageNames.add(name)
    }
  }

  for (const name of discoverWorkspacePackageNames(packageJsonPaths)) {
    packageNames.add(name)
  }

  return [...packageNames]
}

// CHANGE: create a TypeScript module resolution fallback function
// WHY: even if package name discovery misses a workspace package,
//   TypeScript's own resolution can validate the import as a last resort
// PURITY: SHELL
// COMPLEXITY: O(1)/O(1)
const createModuleResolver = (
  program: ts.Program
): (modulePath: string, containingFile: string) => boolean => {
  const compilerOptions = program.getCompilerOptions()
  return (modulePath: string, containingFile: string): boolean => {
    const resolved = ts.resolveModuleName(modulePath, containingFile, compilerOptions, ts.sys)
    return resolved.resolvedModule !== undefined
  }
}

const moduleIndexCache = new WeakMap<ts.Program, ModulePathIndex>()

// CHANGE: collect dependencies from all package.json files near source files, not just program root
// WHY: in monorepos, program.getCurrentDirectory() returns workspace root which has minimal deps.
//   Each package has its own package.json with the actual dependencies used by that package.
// REF: issue #14 — monorepo cross-package imports not recognized
// PURITY: SHELL
// INVARIANT: index contains deps from all relevant package.json files + workspace package names
// COMPLEXITY: O(n)/O(n)
export const buildModulePathIndex = (program: ts.Program): ModulePathIndex => {
  const { localFiles, sourceFileDirs } = collectSourceFilesAndDirs(program)

  const startDirs = [...sourceFileDirs, normalizePath(program.getCurrentDirectory())]
  const packageJsonPaths = collectPackageJsonPaths(startDirs)
  const packageNames = collectAllPackageNames(packageJsonPaths)

  const uniqueFiles = [...new Set(localFiles)]
  return {
    localFiles: uniqueFiles,
    localFileSet: new Set(uniqueFiles),
    packageNames,
    packageNameSet: new Set(packageNames),
    canResolveModule: createModuleResolver(program)
  }
}

export const getModulePathIndex = (program: ts.Program): ModulePathIndex => {
  const cached = moduleIndexCache.get(program)
  if (cached) return cached
  const computed = buildModulePathIndex(program)
  moduleIndexCache.set(program, computed)
  return computed
}
