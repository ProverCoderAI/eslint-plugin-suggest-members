// CHANGE: minimal ESLint node types to avoid `any`
// WHY: structural typing + pure predicates
// QUOTE(TZ): n/a
// REF: AGENTS.md - no any
// SOURCE: n/a
// FORMAT THEOREM: node.type ∈ NodeKinds
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: type guards are total
// COMPLEXITY: O(1)/O(1)

export interface BaseESLintNode {
  readonly type: string
}

export interface ESLintIdentifier extends BaseESLintNode {
  readonly type: "Identifier"
  readonly name: string
}

export interface ESLintLiteral extends BaseESLintNode {
  readonly type: "Literal"
  readonly value: string | number | boolean | null
}

export interface ESLintMemberExpression extends BaseESLintNode {
  readonly type: "MemberExpression"
  readonly object: BaseESLintNode
  readonly property: BaseESLintNode
  readonly computed: boolean
  readonly optional?: boolean
}

export interface ESLintImportSpecifier extends BaseESLintNode {
  readonly type: "ImportSpecifier"
  readonly imported: ESLintIdentifier
  readonly local: ESLintIdentifier
  readonly importKind?: "type" | "typeof" | "value"
}

export interface ESLintImportDeclaration extends BaseESLintNode {
  readonly type: "ImportDeclaration"
  readonly source: ESLintLiteral
  readonly specifiers: ReadonlyArray<BaseESLintNode>
  readonly importKind?: "type" | "typeof" | "value"
}

export const isMemberExpression = (
  node: BaseESLintNode
): node is ESLintMemberExpression => node.type === "MemberExpression"

export const isImportSpecifier = (
  node: BaseESLintNode
): node is ESLintImportSpecifier => node.type === "ImportSpecifier"

export const isImportDeclaration = (
  node: BaseESLintNode
): node is ESLintImportDeclaration => node.type === "ImportDeclaration"

export const isIdentifier = (
  node: BaseESLintNode
): node is ESLintIdentifier => node.type === "Identifier"
