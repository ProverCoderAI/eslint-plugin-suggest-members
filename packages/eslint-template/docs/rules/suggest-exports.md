# Suggest export names (`suggest-exports`)

Reports when a re-export targets a missing export and suggests the closest matches.

Example:

```ts
// ❌ Typo in React hook import
export { useStae, useEffect } from "react"
// ✅ ESLint Error: Export 'useStae' does not exist on type 'typeof import("react")'. Did you mean:
//    - useState
//    - useRef
//    - useMemo
//    - useCallback
```
