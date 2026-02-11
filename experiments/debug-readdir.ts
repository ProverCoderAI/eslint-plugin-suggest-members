import * as ts from "typescript"

const testDirs = [
  "/tmp/gh-issue-solver-1770385315927/packages",
  "/tmp/gh-issue-solver-1770385315927"
]

for (const dir of testDirs) {
  console.log(`\n=== readDirectory("${dir}") ===`)

  // Try different patterns
  const patterns = [
    ["*/package.json"],
    ["**/package.json"],
    ["package.json"],
  ]

  for (const pat of patterns) {
    console.log(`\n  Pattern: ${pat}`)
    try {
      const results = ts.sys.readDirectory?.(dir, undefined, undefined, pat, 1) ?? []
      console.log(`  Results (${results.length}):`)
      for (const r of results) {
        console.log(`    ${r}`)
      }
    } catch (e) {
      console.log(`  Error: ${e}`)
    }
  }

  // Also try just listing dirs
  console.log("\n  Direct dir listing:")
  try {
    const entries = ts.sys.readDirectory?.(dir, undefined, undefined, ["*"], 0) ?? []
    console.log(`  Entries: ${entries.length}`)
    for (const e of entries.slice(0, 10)) {
      console.log(`    ${e}`)
    }
  } catch (e) {
    console.log(`  Error: ${e}`)
  }
}
