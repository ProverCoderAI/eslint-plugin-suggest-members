// CHANGE: filesystem service (Effect + Layer)
// WHY: typed filesystem operations in SHELL
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<Success, FilesystemError>
// INVARIANT: errors are typed
// COMPLEXITY: O(1)/O(n)
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import { Context, Effect, Layer, pipe } from "effect"

import type { FilesystemError } from "../effects/errors.js"
import {
  makeDirectoryNotFoundError,
  makeFileNotFoundError,
  makeReadError,
  makeResolveError
} from "../effects/errors.js"

export interface FilesystemService {
  readonly fileExists: (filePath: string) => Effect.Effect<boolean, FilesystemError>
  readonly readDirectory: (
    dirPath: string
  ) => Effect.Effect<ReadonlyArray<string>, FilesystemError>
  readonly readFile: (filePath: string) => Effect.Effect<string, FilesystemError>
  readonly resolveRelativePath: (
    fromPath: string,
    modulePath: string
  ) => Effect.Effect<string, FilesystemError>
  readonly joinPath: (...segments: ReadonlyArray<string>) => string
  readonly dirname: (value: string) => string
  readonly relativePath: (from: string, to: string) => string
}

export class FilesystemServiceTag extends Context.Tag("FilesystemService")<
  FilesystemServiceTag,
  FilesystemService
>() {}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const createFileExistsEffect = (
  fsService: FileSystem.FileSystem
) =>
(filePath: string): Effect.Effect<boolean, FilesystemError> =>
  pipe(
    fsService.exists(filePath),
    Effect.mapError((error) => makeReadError(filePath, errorMessage(error)))
  )

const createReadDirectoryEffect = (
  fsService: FileSystem.FileSystem
) =>
(dirPath: string): Effect.Effect<ReadonlyArray<string>, FilesystemError> =>
  pipe(
    fsService.exists(dirPath),
    Effect.mapError((error) => makeReadError(dirPath, errorMessage(error))),
    Effect.flatMap((exists) =>
      exists
        ? pipe(
          fsService.readDirectory(dirPath),
          Effect.mapError((error) => makeReadError(dirPath, errorMessage(error)))
        )
        : Effect.fail(makeDirectoryNotFoundError(dirPath))
    )
  )

const createReadFileEffect = (
  fsService: FileSystem.FileSystem
) =>
(filePath: string): Effect.Effect<string, FilesystemError> =>
  pipe(
    fsService.exists(filePath),
    Effect.mapError((error) => makeReadError(filePath, errorMessage(error))),
    Effect.flatMap((exists) =>
      exists
        ? pipe(
          fsService.readFileString(filePath, "utf8"),
          Effect.mapError((error) => makeReadError(filePath, errorMessage(error)))
        )
        : Effect.fail(makeFileNotFoundError(filePath))
    )
  )

const createResolveRelativePathEffect = (
  pathService: Path.Path
) =>
(fromPath: string, modulePath: string): Effect.Effect<string, FilesystemError> =>
  Effect.try({
    try: () => {
      if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
        return pathService.resolve(pathService.dirname(fromPath), modulePath)
      }
      if (modulePath.startsWith("/") || modulePath.startsWith("node:")) {
        return modulePath
      }
      return modulePath
    },
    catch: (error) =>
      makeResolveError(
        modulePath,
        error instanceof Error ? error.message : "resolve-error"
      )
  })

const makeFilesystemService = (
  fsService: FileSystem.FileSystem,
  pathService: Path.Path
): FilesystemService => ({
  fileExists: createFileExistsEffect(fsService),
  readDirectory: createReadDirectoryEffect(fsService),
  readFile: createReadFileEffect(fsService),
  resolveRelativePath: createResolveRelativePathEffect(pathService),
  joinPath: (...segments) => pathService.join(...segments),
  dirname: (value) => pathService.dirname(value),
  relativePath: (from, to) => pathService.relative(from, to)
})

export const makeFilesystemServiceLayer = (): Layer.Layer<FilesystemServiceTag> =>
  pipe(
    Layer.effect(
      FilesystemServiceTag,
      Effect.gen(function*(_) {
        const fsService = yield* _(FileSystem.FileSystem)
        const pathService = yield* _(Path.Path)
        return makeFilesystemService(fsService, pathService)
      })
    ),
    Layer.provideMerge(NodeFileSystem.layer),
    Layer.provideMerge(NodePath.layer)
  )
