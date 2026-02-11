/**
 * Experiment: Verify that readPackageNamesFromNearest uses the wrong starting directory
 * In ESLint context, the program comes from the parser, so let's check what directory
 * it uses and how that affects package discovery.
 */
import * as ts from "typescript"
import * as path from "path"

// Simulate how ESLint's typescript-eslint parser creates a program
// With projectService, it creates a project per tsconfig.json

// The key question: what does program.getCurrentDirectory() return?
// Let's create programs for different tsconfig locations:

const configs = [
  { name: "root", dir: "/tmp/gh-issue-solver-1770385315927" },
  { name: "app", dir: "/tmp/gh-issue-solver-1770385315927/packages/app" },
  { name: "eslint-template", dir: "/tmp/gh-issue-solver-1770385315927/packages/eslint-template" },
]

for (const { name, dir } of configs) {
  const configPath = ts.findConfigFile(dir, ts.sys.fileExists, "tsconfig.json")
  if (!configPath) {
    console.log(`[${name}] No tsconfig.json found`)
    continue
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dir
  )

  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames.slice(0, 1), // Just one file to be quick
    options: parsedConfig.options
  })

  const currentDir = program.getCurrentDirectory()
  console.log(`\n[${name}]`)
  console.log(`  tsconfig.json: ${configPath}`)
  console.log(`  currentDirectory: ${currentDir}`)

  // What package.json would readPackageNamesFromNearest find?
  let searchDir = currentDir.replaceAll("\\", "/")
  let parent = path.dirname(searchDir)
  while (searchDir !== parent) {
    const candidate = path.join(searchDir, "package.json")
    if (ts.sys.fileExists(candidate)) {
      console.log(`  nearest package.json: ${candidate}`)
      const content = ts.sys.readFile(candidate)
      if (content) {
        const pkg = JSON.parse(content)
        const allDeps = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
          ...Object.keys(pkg.peerDependencies || {}),
        ]
        console.log(`  total deps: ${allDeps.length}`)
        console.log(`  deps: ${allDeps.join(", ")}`)
      }
      break
    }
    searchDir = parent
    parent = path.dirname(searchDir)
  }
}
