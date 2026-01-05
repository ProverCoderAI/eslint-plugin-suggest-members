# Suggest import names (`suggest-imports`)

Reports when a named import does not exist and suggests similar exports.

Example:

```ts
// ❌ Typo in named import
import { saveRe1f } from "./hooks"
// ✅ ESLint Error: Export 'saveRe1f' does not exist on type 'typeof import("./hooks")'. Did you mean:
//    - saveRef
//    - saveState
//    - useRef
//    - useState
```
