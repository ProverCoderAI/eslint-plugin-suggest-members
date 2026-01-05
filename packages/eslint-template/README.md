# `@effect-template/eslint-plugin-suggest-members`

Production‑ready ESLint plugin that suggests corrections for typos in TypeScript/JavaScript code. Built with Functional Core / Imperative Shell and Effect‑TS.

## ✨ Key Features

- Smart suggestions for typos (similarity scoring)
- TypeScript‑aware diagnostics with signatures
- Filesystem‑based module path suggestions
- Fully typed, Effect‑TS based architecture

## ⚙️ Configuration (ESLint v9+ Flat Config)

```js
// eslint.config.js
import suggestMembers from "@effect-template/eslint-plugin-suggest-members"

export default [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "suggest-members": suggestMembers
    },
    rules: {
      "suggest-members/suggest-exports": "error",
      "suggest-members/suggest-imports": "error",
      "suggest-members/suggest-members": "error",
      "suggest-members/suggest-missing-names": "error",
      "suggest-members/suggest-module-paths": "error"
    }
  }
]
```

## ✅ Example Diagnostics

### Export Suggestions (`suggest-exports`)
```ts
// ❌ Typo in React hook import
export { useStae, useEffect } from "react"
// ✅ ESLint Error: Export 'useStae' does not exist on type 'typeof import("react")'. Did you mean:
//    - useState
//    - useRef
//    - useMemo
//    - useCallback
```

### Member Suggestions (`suggest-members`)
```ts
// ❌ Typo in localStorage method
localStorage.get1Item("token")
// ✅ ESLint Error: Property 'get1Item' does not exist on type 'Storage'. Did you mean:
//    - getItem(key: string): string | null
//    - setItem(key: string, value: string)
//    - removeItem(key: string)
//    - clear(): void
```

### Module Path Suggestions (`suggest-module-paths`)
```ts
// ❌ Typo in file path
import styles from "./HamsterKo1mbatPage.css"
// ✅ ESLint Error: Cannot find module "./HamsterKo1mbatPage.css". Did you mean:
//    - ./HamsterKombatPage.css
//    - ./HamsterKombatPage.tsx
//    - ./HamsterKombatPage
//    - ../ThemeParamsPage.css
```

### Import Suggestions (`suggest-imports`)
```ts
// ❌ Typo in named import
import { saveRe1f } from "./hooks"
// ✅ ESLint Error: Export 'saveRe1f' does not exist on type 'typeof import("./hooks")'. Did you mean:
//    - saveRef
//    - saveState
//    - useRef
//    - useState
```

### Missing Name Suggestions (`suggest-missing-names`)
```ts
// ❌ Typo in local identifier
const formatGree1ting = () => "ok"
formatGreeting()
// ✅ ESLint Error: Cannot find name 'formatGreeting'. Did you mean:
//    - formatGree1ting(): string
```

## 📚 Rules

| Name | Description | TS Required |
| --- | --- | --- |
| [suggest-exports](docs/rules/suggest-exports.md) | Suggests corrections for missing exports | ✅ |
| [suggest-imports](docs/rules/suggest-imports.md) | Suggests corrections for missing imports | ✅ |
| [suggest-members](docs/rules/suggest-members.md) | Suggests corrections for missing members | ✅ |
| [suggest-missing-names](docs/rules/suggest-missing-names.md) | Suggests corrections for unresolved identifiers | ✅ |
| [suggest-module-paths](docs/rules/suggest-module-paths.md) | Suggests corrections for missing module paths | ❌ |

## Development

```sh
pnpm --filter @effect-template/eslint-template test
```
