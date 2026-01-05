# Suggest member names (`suggest-members`)

Reports when accessing a missing member and suggests similar properties/methods with signatures.

Example:

```ts
// ❌ Typo in localStorage method
localStorage.get1Item("token")
// ✅ ESLint Error: Property 'get1Item' does not exist on type 'Storage'. Did you mean:
//    - getItem(key: string): string | null
//    - setItem(key: string, value: string)
//    - removeItem(key: string)
//    - clear(): void
```
