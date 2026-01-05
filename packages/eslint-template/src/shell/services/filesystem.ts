// CHANGE: filesystem service (Effect + Layer)
// WHY: typed filesystem operations in SHELL
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: Effect<Success, FilesystemError>
// INVARIANT: errors are typed
// COMPLEXITY: O(1)/O(n)
import { Context, Effect, Layer } from "effect"
import * as fs from "node:fs"
import path from "node:path"

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
}

export class FilesystemServiceTag extends Context.Tag("FilesystemService")<
  FilesystemServiceTag,
  FilesystemService
>() {}

const createFileExistsEffect = (
  filePath: string
): Effect.Effect<boolean, FilesystemError> =>
  Effect.try({
    try: () => fs.existsSync(filePath),
    catch: (error) =>
      makeReadError(
        filePath,
        error instanceof Error ? error.message : "file-exists-error"
      )
  })

const createReadDirectoryEffect = (
  dirPath: string
): Effect.Effect<ReadonlyArray<string>, FilesystemError> =>
  Effect.try({
    try: () => {
      if (!fs.existsSync(dirPath)) {
        throw new Error("DirectoryNotFound")
      }
      return fs.readdirSync(dirPath)
    },
    catch: (error) => {
      if (error instanceof Error && error.message === "DirectoryNotFound") {
        return makeDirectoryNotFoundError(dirPath)
      }
      return makeReadError(
        dirPath,
        error instanceof Error ? error.message : "read-dir-error"
      )
    }
  })

const createReadFileEffect = (
  filePath: string
): Effect.Effect<string, FilesystemError> =>
  Effect.try({
    try: () => {
      if (!fs.existsSync(filePath)) {
        throw new Error("FileNotFound")
      }
      return fs.readFileSync(filePath, "utf8")
    },
    catch: (error) => {
      if (error instanceof Error && error.message === "FileNotFound") {
        return makeFileNotFoundError(filePath)
      }
      return makeReadError(
        filePath,
        error instanceof Error ? error.message : "read-file-error"
      )
    }
  })

const createResolveRelativePathEffect = (
  fromPath: string,
  modulePath: string
): Effect.Effect<string, FilesystemError> =>
  Effect.try({
    try: () => {
      if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
        return path.resolve(path.dirname(fromPath), modulePath)
      }
      if (modulePath.startsWith("/")) {
        return modulePath
      }
      if (modulePath.startsWith("node:")) {
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

export const makeFilesystemService = (): FilesystemService => ({
  fileExists: createFileExistsEffect,
  readDirectory: createReadDirectoryEffect,
  readFile: createReadFileEffect,
  resolveRelativePath: createResolveRelativePathEffect
})

export const makeFilesystemServiceLayer = (): Layer.Layer<FilesystemServiceTag> =>
  Layer.succeed(FilesystemServiceTag, makeFilesystemService())
