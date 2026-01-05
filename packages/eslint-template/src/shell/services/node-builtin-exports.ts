// CHANGE: Node.js built-in exports (partial)
// WHY: provide suggestions for built-in modules
// QUOTE(TZ): n/a
// REF: Node.js docs
// SOURCE: n/a
// PURITY: CORE
// EFFECT: n/a
// INVARIANT: built-in map is read-only
// COMPLEXITY: O(1)/O(1)

export const NODE_BUILTIN_EXPORTS: Readonly<Record<string, ReadonlyArray<string>>> = {
  fs: [
    "readFile",
    "readFileSync",
    "writeFile",
    "writeFileSync",
    "readdir",
    "readdirSync",
    "stat",
    "statSync",
    "promises"
  ],
  path: ["resolve", "join", "dirname", "basename", "extname"],
  url: ["URL", "URLSearchParams", "fileURLToPath", "pathToFileURL"],
  crypto: ["createHash", "createHmac", "randomBytes"],
  os: ["platform", "arch", "cpus", "freemem", "totalmem"],
  http: ["createServer", "request", "get"],
  https: ["createServer", "request", "get"],
  util: ["format", "inspect", "promisify"],
  events: ["EventEmitter", "once"],
  stream: ["Readable", "Writable", "pipeline"],
  buffer: ["Buffer"],
  process: ["cwd", "env", "exit", "argv"]
}

export const isNodeBuiltinModule = (modulePath: string): boolean => {
  const clean = modulePath.startsWith("node:") ? modulePath.slice(5) : modulePath
  return Object.prototype.hasOwnProperty.call(NODE_BUILTIN_EXPORTS, clean)
}

export const getNodeBuiltinExports = (
  modulePath: string
): ReadonlyArray<string> | undefined => {
  const clean = modulePath.startsWith("node:") ? modulePath.slice(5) : modulePath
  return NODE_BUILTIN_EXPORTS[clean]
}
