// CHANGE: typed error models for shell effects
// WHY: explicit error unions for Effect
// QUOTE(TZ): n/a
// REF: AGENTS.md typed errors
// SOURCE: n/a
// FORMAT THEOREM: error ∈ ErrorUnion
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: _tag discriminates
// COMPLEXITY: O(1)/O(1)

export type TypeScriptServiceError =
  | { readonly _tag: "TypeCheckerUnavailable"; readonly message: string }
  | { readonly _tag: "TypeNotFound"; readonly message: string }
  | { readonly _tag: "SymbolNotFound"; readonly message: string }
  | { readonly _tag: "ModuleNotFound"; readonly modulePath: string }
  | { readonly _tag: "TypeResolutionError"; readonly message: string }

export type FilesystemError =
  | { readonly _tag: "FileNotFound"; readonly path: string }
  | { readonly _tag: "DirectoryNotFound"; readonly path: string }
  | { readonly _tag: "ReadError"; readonly path: string; readonly message: string }
  | { readonly _tag: "ResolveError"; readonly path: string; readonly message: string }

export const makeTypeCheckerUnavailableError = (): TypeScriptServiceError => ({
  _tag: "TypeCheckerUnavailable",
  message: "TypeScript checker is unavailable"
})

export const makeTypeNotFoundError = (message: string): TypeScriptServiceError => ({
  _tag: "TypeNotFound",
  message
})

export const makeSymbolNotFoundError = (message: string): TypeScriptServiceError => ({
  _tag: "SymbolNotFound",
  message
})

export const makeModuleNotFoundError = (
  modulePath: string
): TypeScriptServiceError => ({
  _tag: "ModuleNotFound",
  modulePath
})

export const makeTypeResolutionError = (
  message: string
): TypeScriptServiceError => ({
  _tag: "TypeResolutionError",
  message
})

export const makeFileNotFoundError = (path: string): FilesystemError => ({
  _tag: "FileNotFound",
  path
})

export const makeDirectoryNotFoundError = (path: string): FilesystemError => ({
  _tag: "DirectoryNotFound",
  path
})

export const makeReadError = (
  path: string,
  message: string
): FilesystemError => ({
  _tag: "ReadError",
  path,
  message
})

export const makeResolveError = (
  path: string,
  message: string
): FilesystemError => ({
  _tag: "ResolveError",
  path,
  message
})
