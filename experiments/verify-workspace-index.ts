/**
 * Experiment: Verify that buildModulePathIndex now discovers workspace packages
 */
import * as ts from "typescript"

// Create a TS program for the app package
const configPath = ts.findConfigFile(
  "/tmp/gh-issue-solver-1770385315927/packages/app",
  ts.sys.fileExists,
  "tsconfig.json"
)

if (!configPath) {
  console.error("Could not find tsconfig.json")
  process.exit(1)
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  "/tmp/gh-issue-solver-1770385315927/packages/app"
)

const program = ts.createProgram({
  rootNames: parsedConfig.fileNames,
  options: parsedConfig.options
})

console.log("=== Source file directories (non-declaration, non-node_modules) ===")
const dirs = new Set<string>()
for (const sf of program.getSourceFiles()) {
  if (!sf.isDeclarationFile && !sf.fileName.includes("/node_modules/")) {
    const dir = sf.fileName.substring(0, sf.fileName.lastIndexOf("/"))
    dirs.add(dir)
    console.log("  file:", sf.fileName)
  }
}
console.log("\nUnique dirs:")
for (const d of dirs) {
  console.log("  ", d)
}

// Now find package.json for each source file directory
console.log("\n=== Package.json discovery from source file dirs ===")
const findNearestPackageJson = (startDir: string): string | null => {
  let currentDir = startDir
  let parent = currentDir.substring(0, currentDir.lastIndexOf("/"))
  while (currentDir !== parent && currentDir.length > 0) {
    const candidate = currentDir + "/package.json"
    if (ts.sys.fileExists(candidate)) return candidate
    currentDir = parent
    parent = currentDir.substring(0, currentDir.lastIndexOf("/"))
  }
  return null
}

const pkgJsonPaths = new Set<string>()
for (const d of dirs) {
  const found = findNearestPackageJson(d)
  if (found) pkgJsonPaths.add(found)
}
pkgJsonPaths.add(findNearestPackageJson(program.getCurrentDirectory()) || "")

console.log("Found package.json files:")
for (const p of pkgJsonPaths) {
  if (!p) continue
  console.log("  ", p)
  const content = ts.sys.readFile(p)
  if (content) {
    const pkg = JSON.parse(content)
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ]
    console.log("    deps:", allDeps.length, "->", allDeps.join(", "))
  }
}

// Check workspace sibling discovery
console.log("\n=== Workspace sibling discovery ===")
for (const p of pkgJsonPaths) {
  if (!p) continue
  const pkgDir = p.substring(0, p.lastIndexOf("/"))
  const parentDir = pkgDir.substring(0, pkgDir.lastIndexOf("/"))
  console.log(`\nSiblings of ${pkgDir}:`)

  const siblings = ts.sys.readDirectory?.(parentDir, undefined, undefined, ["*/package.json"], 1) ?? []
  for (const s of siblings) {
    const content = ts.sys.readFile(s)
    if (content) {
      try {
        const pkg = JSON.parse(content)
        console.log(`  ${s} -> name: ${pkg.name || "(unnamed)"}`)
      } catch {
        console.log(`  ${s} -> (parse error)`)
      }
    }
  }
}
