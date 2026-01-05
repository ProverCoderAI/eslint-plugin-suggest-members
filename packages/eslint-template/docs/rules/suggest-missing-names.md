# Suggest missing names (`suggest-missing-names`)

Reports unresolved identifiers and suggests similar in-scope names with signatures.

Example:

```ts
// ❌ Typo in local identifier
const formatGree1ting = () => "ok"
formatGreeting()
// ✅ ESLint Error: Cannot find name 'formatGreeting'. Did you mean:
//    - formatGree1ting(): string
```
