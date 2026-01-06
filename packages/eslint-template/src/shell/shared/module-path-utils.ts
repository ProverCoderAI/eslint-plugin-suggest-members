// CHANGE: module path utilities
// WHY: normalize module specifiers for filesystem suggestions
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: normalized paths use posix separators
// COMPLEXITY: O(n)/O(1)
import { SUPPORTED_EXTENSIONS } from "../../core/validation/candidates.js"

export const MODULE_FILE_EXTENSIONS = SUPPORTED_EXTENSIONS

export const stripKnownExtension = (filePath: string): string => {
  for (const ext of MODULE_FILE_EXTENSIONS) {
    if (filePath.endsWith(ext)) {
      return filePath.slice(0, -ext.length)
    }
  }
  return filePath
}

export const normalizeModuleSpecifier = (
  relativePath: (from: string, to: string) => string,
  fromDir: string,
  absoluteWithoutExtension: string
): string => {
  const relative = relativePath(fromDir, absoluteWithoutExtension).replaceAll("\\", "/")
  if (relative.startsWith("./") || relative.startsWith("../")) {
    return relative
  }
  return `./${relative}`
}
