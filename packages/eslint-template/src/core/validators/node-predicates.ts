// CHANGE: pure predicates for ESLint nodes
// WHY: keep decision logic in CORE
// QUOTE(TZ): n/a
// REF: AGENTS.md CORE↔SHELL separation
// SOURCE: n/a
// FORMAT THEOREM: predicate(node) ∈ {true,false}
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: no side effects
// COMPLEXITY: O(1)/O(1)
import { Match } from "effect"

import {
  type BaseESLintNode,
  isIdentifier,
  isImportDeclaration,
  isImportSpecifier,
  isMemberExpression
} from "../types/eslint-nodes.js"

export const shouldSkipMemberExpression = (node: BaseESLintNode): boolean => {
  if (!isMemberExpression(node)) return true

  if (node.computed) return true
  if (node.object.type === "MemberExpression") return true

  return false
}

export const shouldSkipIdentifier = (name: string): boolean => {
  if (name.length === 0) return true
  if (name.startsWith("__")) return true
  if (name.startsWith("_")) return true
  return false
}

export const extractPropertyName = (node: BaseESLintNode): string => {
  if (!isMemberExpression(node)) return ""
  if (isIdentifier(node.property)) {
    return node.property.name
  }
  return ""
}

export const isModulePath = (value: string): boolean => {
  if (value.startsWith("./") || value.startsWith("../")) return true
  if (value.startsWith("/")) return true
  if (value.startsWith("node:")) return true

  const head = value.split("/")[0] ?? ""
  return head.length > 0 && /^[a-z0-9-]+$/i.test(head)
}

export const extractModuleName = (importPath: string): string =>
  Match.value(importPath).pipe(
    Match.when(
      (path) => path.startsWith("@"),
      (path) => {
        const [scope, pkg] = path.split("/")
        if (scope !== undefined && pkg !== undefined) {
          return `${scope}/${pkg}`
        }
        return path
      }
    ),
    Match.when(
      (path) => path.startsWith("./") || path.startsWith("../"),
      (path) => {
        const parts = path.split("/")
        const filename = parts.at(-1) ?? ""
        return filename.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "")
      }
    ),
    Match.when((path) => path.startsWith("node:"), (path) => path.slice(5)),
    Match.orElse((path) => {
      const firstSlash = path.indexOf("/")
      if (firstSlash === -1) return path
      return path.slice(0, firstSlash)
    })
  )

export const isTypeOnlyImport = (node: BaseESLintNode): boolean => {
  if (isImportDeclaration(node)) {
    return node.importKind === "type"
  }

  if (isImportSpecifier(node)) {
    return node.importKind === "type"
  }

  return false
}
