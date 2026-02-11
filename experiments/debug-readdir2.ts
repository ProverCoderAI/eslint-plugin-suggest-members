import * as ts from "typescript"

// Test readDirectory behavior
const parentDir = "/tmp/gh-issue-solver-1770385315927/packages"
console.log(`\nEntries in ${parentDir} (depth=1):`)
const entries = ts.sys.readDirectory?.(parentDir, undefined, ["node_modules"], undefined, 1) ?? []
console.log(`Total entries: ${entries.length}`)
for (const e of entries) {
  console.log(`  ${e}`)
}

// Check what dirname gives for entries
console.log(`\nUnique directories from entries:`)
const dirs = new Set<string>()
for (const entry of entries) {
  const normalized = entry.replaceAll("\\", "/")
  const lastSlash = normalized.lastIndexOf("/")
  const dir = lastSlash > 0 ? normalized.slice(0, lastSlash) : normalized
  if (dir !== parentDir) {
    dirs.add(dir)
  }
}
for (const d of dirs) {
  console.log(`  ${d}`)
  const pkgJson = d + "/package.json"
  const exists = ts.sys.fileExists(pkgJson)
  console.log(`    package.json exists: ${exists}`)
  if (exists) {
    const content = ts.sys.readFile(pkgJson)
    if (content) {
      try {
        const pkg = JSON.parse(content)
        console.log(`    name: ${pkg.name}`)
      } catch (e) {
        console.log(`    parse error`)
      }
    }
  }
}
