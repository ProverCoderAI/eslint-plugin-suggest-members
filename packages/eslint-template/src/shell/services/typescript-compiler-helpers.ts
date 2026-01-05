// CHANGE: helper functions for TypeScript module resolution
// WHY: keep TS resolution logic isolated
// QUOTE(TZ): n/a
// REF: AGENTS.md SHELL
// SOURCE: n/a
// PURITY: SHELL
// EFFECT: n/a
// INVARIANT: deterministic resolution for given program
// COMPLEXITY: O(n)/O(1)
import * as ts from "typescript"

export const findContextFile = (program: ts.Program): ts.SourceFile | undefined => {
  const files = program.getSourceFiles()
  return (
    files.find((file) => !file.isDeclarationFile && file.fileName.endsWith(".ts")) ??
      files[0]
  )
}

export const resolveModuleSymbol = (
  checker: ts.TypeChecker,
  program: ts.Program,
  moduleResolution: ts.ResolvedModuleWithFailedLookupLocations
): ts.Symbol | undefined => {
  if (!moduleResolution.resolvedModule) {
    return undefined
  }

  const resolvedFile = program.getSourceFile(
    moduleResolution.resolvedModule.resolvedFileName
  )

  if (!resolvedFile) return undefined
  return checker.getSymbolAtLocation(resolvedFile)
}

export const findGlobalModuleSymbol = (
  checker: ts.TypeChecker,
  contextFile: ts.SourceFile,
  modulePath: string
): ts.Symbol | undefined => {
  const symbols = checker.getSymbolsInScope(
    contextFile,
    ts.SymbolFlags.Module | ts.SymbolFlags.Namespace
  )

  return symbols.find((symbol) => {
    const name = symbol.getName()
    return name === modulePath || name === `"${modulePath}"` || name.includes(modulePath)
  })
}

export const findAmbientModuleSymbol = (
  checker: ts.TypeChecker,
  modulePath: string
): ts.Symbol | undefined =>
  checker
    .getAmbientModules()
    .find((symbol) => symbol.getName() === `"${modulePath}"` || symbol.getName() === modulePath)

export const extractExportNames = (
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol
): ReadonlyArray<string> =>
  checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol) => symbol.getName())
    .filter((name) => name.length > 0)

export const findModuleSymbol = (
  checker: ts.TypeChecker,
  program: ts.Program,
  modulePath: string,
  contextFile: ts.SourceFile
): ts.Symbol | undefined => {
  const compilerOptions = program.getCompilerOptions()
  const moduleResolution = ts.resolveModuleName(
    modulePath,
    contextFile.fileName,
    compilerOptions,
    ts.sys
  )

  return (
    resolveModuleSymbol(checker, program, moduleResolution) ??
      findGlobalModuleSymbol(checker, contextFile, modulePath) ??
      findAmbientModuleSymbol(checker, modulePath)
  )
}
