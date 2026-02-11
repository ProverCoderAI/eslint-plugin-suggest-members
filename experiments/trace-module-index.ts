/**
 * Experiment: Trace what buildModulePathIndex produces for the app package
 * This helps understand why workspace packages might not be in the index
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

// Simulate what readPackageNamesFromNearest does
const currentDir = program.getCurrentDirectory()
console.log("Program current directory:", currentDir)

// Find nearest package.json
let dir = currentDir
while (dir !== "/") {
  const candidate = dir + "/package.json"
  if (ts.sys.fileExists(candidate)) {
    console.log("\nFound package.json at:", candidate)
    const content = ts.sys.readFile(candidate)
    if (content) {
      const pkg = JSON.parse(content)
      console.log("\nDependency keys:", Object.keys(pkg.dependencies || {}))
      console.log("DevDependency keys:", Object.keys(pkg.devDependencies || {}))

      // Check for workspace references
      for (const [key, value] of Object.entries(pkg.dependencies || {})) {
        if (typeof value === "string" && value.includes("workspace")) {
          console.log(`  Workspace dep: ${key} = ${value}`)
        }
      }
      for (const [key, value] of Object.entries(pkg.devDependencies || {})) {
        if (typeof value === "string" && value.includes("workspace")) {
          console.log(`  Workspace devDep: ${key} = ${value}`)
        }
      }
    }
    break
  }
  dir = dir.substring(0, dir.lastIndexOf("/"))
}

// Test module resolution for workspace package
const testModules = [
  "@prover-coder-ai/eslint-plugin-suggest-members",
  "effect",
  "eff1ect"
]

console.log("\n--- Module resolution tests ---")
for (const mod of testModules) {
  const resolution = ts.resolveModuleName(
    mod,
    currentDir + "/src/app/main.ts",
    parsedConfig.options,
    ts.sys
  )
  console.log(`\n${mod}:`)
  console.log("  Resolved:", resolution.resolvedModule?.resolvedFileName || "NOT FOUND")
}

// List source files
console.log("\n--- Source files (non-declaration, non-node_modules) ---")
for (const sf of program.getSourceFiles()) {
  if (!sf.isDeclarationFile && !sf.fileName.includes("/node_modules/")) {
    console.log("  ", sf.fileName)
  }
}
