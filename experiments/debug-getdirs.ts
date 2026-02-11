import * as ts from "typescript"

const dirs = [
  "/tmp/gh-issue-solver-1770385315927/packages",
  "/tmp/gh-issue-solver-1770385315927"
]

for (const dir of dirs) {
  console.log(`\ngetDirectories(${dir}):`)
  const subdirs = ts.sys.getDirectories?.(dir) ?? []
  console.log(`  Found ${subdirs.length} subdirs:`)
  for (const sub of subdirs) {
    console.log(`    ${sub}`)
    const pkgJson = dir + "/" + sub + "/package.json"
    const exists = ts.sys.fileExists(pkgJson)
    if (exists) {
      const content = ts.sys.readFile(pkgJson)
      if (content) {
        try {
          const pkg = JSON.parse(content)
          console.log(`      -> name: ${pkg.name}`)
        } catch {
          console.log(`      -> parse error`)
        }
      }
    }
  }
}
