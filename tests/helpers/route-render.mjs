// Test-only: server-renders a REAL route file (app/services/<slug>/page.tsx) and its generateMetadata, through the real
// PublishedPage, ServiceLanding, gate and metadata code. Based on tests/content/render-helper.mjs, with two additions:
//  - next/navigation's notFound() is a stand-in that throws Next's 404 signal (digest NEXT_HTTP_ERROR_FALLBACK;404), so a
//    refused page is observed exactly as Next would see it;
//  - FIXTURE mode (approved isolated fixtures only): every transpiled component that imports "@/lib/seo/publication-gate"
//    gets a wrapper that re-exports the REAL gate module unchanged, except that the three lookups a route or component
//    uses (getPublishedPage, publishedPagePaths, getPublishedNavLinks) receive the fixture's records and dependencies.
//    Snapshots are still produced and registered by the real gate, so assertPublished / getManifestEntry behave as in
//    production. Nothing here touches application code or the real evidence ledger.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const ROOT = path.resolve(import.meta.dirname, "../..")
const CACHE = path.join(ROOT, "node_modules/.cache/route-render")
mkdirSync(CACHE, { recursive: true })

export const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404"
const GATE_URL = pathToFileURL(path.join(ROOT, "lib/seo/publication-gate.ts")).href

function makeMode(fixture) {
  const OUT = mkdtempSync(path.join(CACHE, fixture ? "fixture-" : "real-"))
  const stub = (name, src) => {
    const f = path.join(OUT, `stub-${name.replace(/\W+/g, "_")}.mjs`)
    writeFileSync(f, src)
    return pathToFileURL(f).href
  }
  const STUBS = {
    "next/image": stub("next/image", `import { createElement } from "react"; export default function Image(p){ const { src, alt, width, height, className } = p; return createElement("img", { src, alt, width, height, className }) }`),
    "next/link": stub("next/link", `import { createElement } from "react"; export default function Link({ href, children, ...r }){ return createElement("a", { href, ...r }, children) }`),
    "next/cache": stub("next/cache", `export const cacheLife = () => {}`),
    "next/navigation": stub("next/navigation", `export function notFound(){ const e = new Error("NEXT_NOT_FOUND"); e.digest = ${JSON.stringify(NOT_FOUND_DIGEST)}; throw e }`),
    "@/components/enquiry-form": stub("enquiry-form", `export function EnquiryForm(){ return null }`),
  }
  if (fixture) {
    STUBS["@/lib/seo/publication-gate"] = stub("gate-fixture", `export * from ${JSON.stringify(GATE_URL)}
import * as G from ${JSON.stringify(GATE_URL)}
const fx = () => { const f = globalThis.__ROUTE_FIXTURE__; if (!f) throw new Error("no route fixture set"); return f }
export const getPublishedPage = (kind, slug) => G.getPublishedPage(kind, slug, fx().records, fx().deps)
export const publishedPagePaths = () => G.publishedPagePaths(fx().records, fx().deps)
export const getPublishedNavLinks = () => G.getPublishedNavLinks(fx().records, fx().deps)
`)
  }
  const done = new Map()
  function transpile(rel) {
    if (done.has(rel)) return done.get(rel)
    const src = readFileSync(path.join(ROOT, rel), "utf8")
    const out = path.join(OUT, rel.replace(/[\\/]/g, "__").replace(/\.tsx$/, ".mjs"))
    const url = pathToFileURL(out).href
    done.set(rel, url)
    let js = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    js = js.replace(/(from\s+|import\s+)"(@\/[^"]+)"/g, (m, kw, spec) => {
      if (STUBS[spec]) return `${kw}"${STUBS[spec]}"`
      for (const ext of [".tsx", ".ts"]) {
        const f = `${spec.slice(2)}${ext}`
        if (existsSync(path.join(ROOT, f))) return ext === ".tsx" ? `${kw}"${transpile(f)}"` : `${kw}"${pathToFileURL(path.join(ROOT, f)).href}"`
      }
      throw new Error(`cannot resolve ${spec}`)
    })
    js = js.replace(/(from\s+)"(next\/(?:image|link|cache|navigation))"/g, (m, kw, spec) => `${kw}"${STUBS[spec]}"`)
    writeFileSync(out, js)
    return url
  }
  return transpile
}

const modes = { real: null, fixture: null }

/** Imports a route file. `fixture` = { records, deps } for approved isolated fixtures; omit for the real registries. */
export async function loadRoute(rel, fixture) {
  const key = fixture ? "fixture" : "real"
  modes[key] ??= makeMode(key === "fixture")
  globalThis.__ROUTE_FIXTURE__ = fixture ?? undefined
  return import(modes[key](rel))
}

/** Renders the route's default export. Returns { status: 200, html } or { status: 404 } when notFound() was called. */
export async function renderRoute(rel, fixture) {
  const mod = await loadRoute(rel, fixture)
  const { createElement } = await import("react")
  const { prerender } = await import("react-dom/static")
  let notFound = false
  try {
    const { prelude } = await prerender(createElement(mod.default), { onError(e) { if (e?.digest === NOT_FOUND_DIGEST) notFound = true } })
    const chunks = []
    for await (const c of prelude) chunks.push(Buffer.from(c))
    if (notFound) return { status: 404 }
    return { status: 200, html: Buffer.concat(chunks).toString("utf8") }
  } catch (e) {
    if (notFound || e?.digest === NOT_FOUND_DIGEST) return { status: 404 }
    throw e
  }
}

/** Calls the route's generateMetadata. Returns { status: 200, metadata } or { status: 404 }. */
export async function routeMetadata(rel, fixture) {
  const mod = await loadRoute(rel, fixture)
  try {
    return { status: 200, metadata: await mod.generateMetadata() }
  } catch (e) {
    if (e?.digest === NOT_FOUND_DIGEST) return { status: 404 }
    throw e
  }
}
