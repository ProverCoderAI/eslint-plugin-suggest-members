// CHANGE: migrate script to Effect + platform services
// WHY: enforce FC/IS checks via controlled effects and Effect runtime
// QUOTE(TZ): n/a
// REF: AGENTS.md Effect-TS practices
// SOURCE: n/a
// FORMAT THEOREM: exitCode = 1 ⇔ violations > 0
// PURITY: SHELL
// EFFECT: Effect<Success, ScriptError, NodeContext>
// INVARIANT: deterministic analysis for given sources
// COMPLEXITY: O(n)/O(1)
import {
  Project,
  Node,
  SyntaxKind,
  SourceFile,
  FunctionDeclaration,
  ArrowFunction
} from "ts-morph"
import { Effect, Match, pipe } from "effect"
import * as Console from "effect/Console"
import { Path } from "@effect/platform/Path"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"

// === КОНФИГ ===

const CORE_DIR = "src/core"

// Можно оставить, если хочешь потом использовать для других проверок,
// но для поиска CORE-кандидатов мы их больше не используем.
const SHELL_DIRS = ["src/app", "src/infra", "src/ui"]

const PURE_LIB_MODULES = [
  "@effect/schema/Schema",
  "@effect/data/ReadonlyArray",
  "@effect/data/ReadonlyRecord",
  "@effect/data/Option",
  "ts-pattern"
]

const BANNED_IDENTIFIERS = [
  "console",
  "process",
  "window",
  "document",
  "setTimeout",
  "setInterval",
  "Date"
]

const BANNED_CALL_PREFIXES = [
  "console.",
  "Effect.run",
  "Effect.runPromise",
  "fetch"
]

const TS_CONFIG_PATH = "tsconfig.json"

// === ТИПЫ ОШИБОК ===

type ScriptError =
  | { readonly _tag: "ProjectLoadError"; readonly message: string }
  | { readonly _tag: "AnalysisFailed"; readonly message: string }

const makeProjectLoadError = (message: string): ScriptError => ({
  _tag: "ProjectLoadError",
  message
})

const makeAnalysisFailedError = (): ScriptError => ({
  _tag: "AnalysisFailed",
  message: "analysis-failed"
})

// === УТИЛИТЫ (CORE-like) ===

const isInDir = (
  pathService: Path,
  file: SourceFile,
  dir: string
): boolean => {
  const filePath = pathService.normalize(file.getFilePath())
  const absDir = pathService.resolve(dir)
  return filePath.startsWith(absDir + pathService.sep)
}

const isCoreFile = (pathService: Path, file: SourceFile): boolean =>
  isInDir(pathService, file, CORE_DIR)

// пока не используем, но пусть будет — вдруг пригодится
const isShellFile = (pathService: Path, file: SourceFile): boolean => {
  const filePath = pathService.normalize(file.getFilePath())
  return SHELL_DIRS.some((dir) =>
    filePath.startsWith(pathService.resolve(dir) + pathService.sep)
  )
}

const allImportsAllowedForCore = (
  pathService: Path,
  file: SourceFile
): boolean =>
  file.getImportDeclarations().every((imp) => {
    // Чисто типовые импорты разрешаем откуда угодно
    if (imp.isTypeOnly()) return true

    const moduleSpecifier = imp.getModuleSpecifierValue()

    // Белый список чистых библиотек
    if (PURE_LIB_MODULES.includes(moduleSpecifier)) return true

    // Попробуем резолвнуть файл, на который указывает импорт
    const target = imp.getModuleSpecifierSourceFile()
    if (!target) {
      // Не смогли резолвнуть — считаем "подозрительным"
      return false
    }

    // Разрешаем только core → core
    if (isCoreFile(pathService, target)) return true

    // Всё остальное для core запрещено
    return false
  })

const getAllFunctions = (
  file: SourceFile
): ReadonlyArray<FunctionDeclaration | ArrowFunction> => {
  const result: Array<FunctionDeclaration | ArrowFunction> = []

  // Обычные function declaration
  result.push(...file.getFunctions())

  // Arrow-функции вида const f = () => {}
  for (const declaration of file.getVariableDeclarations()) {
    const init = declaration.getInitializer()
    if (init && Node.isArrowFunction(init)) {
      result.push(init)
    }
  }

  return result
}

const hasAwaitOrYield = (node: Node): boolean => {
  let found = false
  node.forEachDescendant((n) => {
    if (
      n.getKind() === SyntaxKind.AwaitExpression ||
      n.getKind() === SyntaxKind.YieldExpression
    ) {
      found = true
      return false
    }
    return undefined
  })
  return found
}

const usesBannedIdentifiers = (node: Node): boolean => {
  let bannedFound = false

  node.forEachDescendant((n) => {
    if (Node.isIdentifier(n)) {
      const name = n.getText()
      if (BANNED_IDENTIFIERS.includes(name)) {
        bannedFound = true
        return false
      }
    }

    if (Node.isPropertyAccessExpression(n)) {
      const text = n.getText()
      if (
        BANNED_IDENTIFIERS.some(
          (banned) => text === banned || text.startsWith(`${banned}.`)
        )
      ) {
        bannedFound = true
        return false
      }
    }

    if (Node.isNewExpression(n)) {
      const expr = n.getExpression()
      if (expr.getText() === "Date") {
        bannedFound = true
        return false
      }
    }

    return undefined
  })

  return bannedFound
}

const hasAssignments = (node: Node): boolean => {
  let found = false

  node.forEachDescendant((n) => {
    if (Node.isBinaryExpression(n)) {
      const op = n.getOperatorToken().getKind()
      if (
        op === SyntaxKind.EqualsToken ||
        op === SyntaxKind.PlusEqualsToken ||
        op === SyntaxKind.MinusEqualsToken ||
        op === SyntaxKind.AsteriskEqualsToken ||
        op === SyntaxKind.SlashEqualsToken ||
        op === SyntaxKind.PercentEqualsToken
      ) {
        found = true
        return false
      }
    }
    return undefined
  })

  return found
}

const hasImpureCalls = (node: Node): boolean => {
  let impure = false

  node.forEachDescendant((n) => {
    if (Node.isCallExpression(n)) {
      const expr = n.getExpression()
      const text = expr.getText()

      if (
        BANNED_CALL_PREFIXES.some(
          (prefix) => text === prefix || text.startsWith(prefix)
        )
      ) {
        impure = true
        return false
      }
    }
    return undefined
  })

  return impure
}

const importsAllowedForCoreCandidate = (
  pathService: Path,
  file: SourceFile
): boolean => allImportsAllowedForCore(pathService, file)

const isCoreCandidateFunction = (
  pathService: Path,
  fn: FunctionDeclaration | ArrowFunction
): boolean => {
  const file = fn.getSourceFile()

  // 1. Чистые зависимости
  if (!importsAllowedForCoreCandidate(pathService, file)) {
    return false
  }

  // 2. Нет await/yield
  if (hasAwaitOrYield(fn)) {
    return false
  }

  // 3. Нет запрещённых глобалов
  if (usesBannedIdentifiers(fn)) {
    return false
  }

  // 4. Нет присваиваний
  if (hasAssignments(fn)) {
    return false
  }

  // 5. Нет явно нечистых вызовов
  if (hasImpureCalls(fn)) {
    return false
  }

  return true
}

// === АНАЛИЗ ===

interface AnalysisResult {
  readonly coreImportErrors: ReadonlyArray<string>
  readonly misplacedCoreFunctions: ReadonlyArray<string>
  readonly coreFunctions: ReadonlyArray<string>
}

const analyzeProject = (
  pathService: Path,
  project: Project
): AnalysisResult => {
  const coreImportErrors: Array<string> = []
  const misplacedCoreFunctions: Array<string> = []
  const coreFunctions: Array<string> = []
  const cwd = pathService.resolve(".")

  for (const file of project.getSourceFiles()) {
    const filePathAbs = file.getFilePath()
    const filePathRel = pathService.relative(cwd, filePathAbs)

    // 1) CORE никогда не зависит от SHELL
    if (isCoreFile(pathService, file)) {
      if (!allImportsAllowedForCore(pathService, file)) {
        coreImportErrors.push(filePathRel)
      }
    }

    // 2) Поиск CORE-кандидатов во всех файлах проекта
    const fns = getAllFunctions(file)

    for (const fn of fns) {
      if (!isCoreCandidateFunction(pathService, fn)) continue

      const line = fn.getStartLineNumber()
      const name =
        Node.isFunctionDeclaration(fn) && fn.getName()
          ? fn.getName()
          : "<anonymous/arrow>"

      if (isCoreFile(pathService, file)) {
        // уже лежит в CORE — просто фиксируем
        coreFunctions.push(`${filePathRel}:${line} → ${name}`)
      } else {
        // CORE-кандидат, который лежит НЕ в src/core
        misplacedCoreFunctions.push(`${filePathRel}:${line} → ${name}`)
      }
    }
  }

  return { coreImportErrors, misplacedCoreFunctions, coreFunctions }
}

// === ОТЧЁТ ===

const reportResults = (result: AnalysisResult): Effect.Effect<boolean> =>
  Effect.gen(function*(_) {
    let hasErrors = false

    if (result.coreImportErrors.length > 0) {
      hasErrors = true
      yield* _(Console.error("❌ CORE files importing forbidden modules:"))
      for (const file of result.coreImportErrors) {
        yield* _(Console.error(`  - ${file}`))
      }
    }

    if (result.misplacedCoreFunctions.length > 0) {
      hasErrors = true
      yield* _(
        Console.error(
          "❌ CORE-like pure functions found outside src/core (move them to CORE):"
        )
      )
      for (const entry of result.misplacedCoreFunctions) {
        yield* _(Console.error(`  - ${entry}`))
      }
    }

    if (result.coreFunctions.length > 0) {
      yield* _(Console.log("ℹ️ CORE-like functions already in src/core:"))
      for (const entry of result.coreFunctions) {
        yield* _(Console.log(`  - ${entry}`))
      }
    }

    if (!hasErrors) {
      yield* _(Console.log("✅ Functional CORE / Imperative SHELL checks passed."))
    }

    return hasErrors
  })

const reportFatalError = (error: ScriptError): Effect.Effect<void> =>
  Match.value(error).pipe(
    Match.when(
      { _tag: "ProjectLoadError" },
      (err) => Console.error(`❌ Failed to load project: ${err.message}`)
    ),
    Match.when({ _tag: "AnalysisFailed" }, () => Effect.succeed(undefined)),
    Match.exhaustive
  )

// === MAIN ===

const makeProjectEffect: Effect.Effect<Project, ScriptError> = Effect.try({
  try: () => new Project({ tsConfigFilePath: TS_CONFIG_PATH }),
  catch: (error) =>
    makeProjectLoadError(
      error instanceof Error ? error.message : "project-load-error"
    )
})

const program = pipe(
  Effect.gen(function*(_) {
    const pathService = yield* _(Path)
    const project = yield* _(makeProjectEffect)
    const result = analyzeProject(pathService, project)
    const hasErrors = yield* _(reportResults(result))
    if (hasErrors) {
      return yield* _(Effect.fail(makeAnalysisFailedError()))
    }
    return undefined
  }),
  Effect.catchAll((error) =>
    pipe(
      reportFatalError(error),
      Effect.flatMap(() => Effect.fail(error))
    )
  )
)

NodeRuntime.runMain(program, { disableErrorReporting: true, disablePrettyLogger: true })
  |> Effect.provide(NodeContext.layer)
  
