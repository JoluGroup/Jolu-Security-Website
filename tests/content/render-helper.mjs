// Server-renders real components to HTML inside Node's test runner, with no extra dependencies:
// each .tsx component is transpiled with the repo's own TypeScript into a scratch dir under node_modules/.cache,
// "@/lib/*" imports keep pointing at the real sources (Node strips their types), and framework-only modules
// (next/image, next/link, next/cache, the enquiry form) are replaced with tiny stand-ins.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const ROOT = path.resolve(import.meta.dirname, "../..")
const CACHE = path.join(ROOT, "node_modules/.cache/content-render")
mkdirSync(CACHE, { recursive: true })
const OUT = mkdtempSync(path.join(CACHE, "run-"))

const STUBS = {
  "next/image": `import { createElement } from "react"; export default function Image(p){ const { src, alt, width, height, className } = p; return createElement("img", { src, alt, width, height, className }) }`,
  "next/link": `import { createElement } from "react"; export default function Link({ href, children, ...r }){ return createElement("a", { href, ...r }, children) }`,
  "next/cache": `export const cacheLife = () => {}`,
  "@/components/enquiry-form": `export function EnquiryForm(){ return null }`,
}
for (const [name, src] of Object.entries(STUBS)) {
  const file = path.join(OUT, `stub-${name.replace(/\W+/g, "_")}.mjs`)
  writeFileSync(file, src)
  STUBS[name] = pathToFileURL(file).href
}

const done = new Map()
function transpile(rel) {
  if (done.has(rel)) return done.get(rel)
  const src = readFileSync(path.join(ROOT, rel), "utf8")
  const out = path.join(OUT, rel.replace(/[\\/]/g, "__").replace(/\.tsx$/, ".mjs"))
  const url = pathToFileURL(out).href
  done.set(rel, url)
  let js = ts.transpileModule(src, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  js = js.replace(/(from\s+|import\s+)"(@\/[^"]+)"/g, (m, kw, spec) => {
    if (STUBS[spec]) return `${kw}"${STUBS[spec]}"`
    for (const ext of [".tsx", ".ts"]) {
      const f = `${spec.slice(2)}${ext}`
      if (existsSync(path.join(ROOT, f))) return ext === ".tsx" ? `${kw}"${transpile(f)}"` : `${kw}"${pathToFileURL(path.join(ROOT, f)).href}"`
    }
    throw new Error(`cannot resolve ${spec}`)
  })
  js = js.replace(/(from\s+)"(next\/(?:image|link|cache))"/g, (m, kw, spec) => `${kw}"${STUBS[spec]}"`)
  writeFileSync(out, js)
  return url
}

/** Renders the named export of a component file to static HTML (awaits async server components). */
export async function renderComponent(rel, exportName, props = {}) {
  const mod = await import(transpile(rel))
  const { createElement } = await import("react")
  const { prerender } = await import("react-dom/static")
  const { prelude } = await prerender(createElement(mod[exportName], props))
  const chunks = []
  for await (const c of prelude) chunks.push(Buffer.from(c))
  return Buffer.concat(chunks).toString("utf8")
}
