# Suggest module paths (`suggest-module-paths`)

Reports when a module path cannot be resolved and suggests similar paths.

Example:

```ts
// ❌ Typo in file path
import styles from "./HamsterKo1mbatPage.css"
// ✅ ESLint Error: Cannot find module "./HamsterKo1mbatPage.css". Did you mean:
//    - ./HamsterKombatPage.css
//    - ./HamsterKombatPage.tsx
//    - ./HamsterKombatPage
//    - ../ThemeParamsPage.css
```
