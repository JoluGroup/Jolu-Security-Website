// Shared rules for public/ asset hygiene. Used by scripts/assets/check-public-assets.mjs and tests/assets.
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

export const MEDIA_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic|pdf|mp4|webm|mov|m4v|avi|mkv|mp3|wav|ogg|m4a|aac|flac)$/i

/** Non-photo brand/framework assets allowed directly under public/, pinned by SHA-256. */
export const BRAND_ALLOWLIST = {
  "lovable-uploads/jolu-logo.png": "aa9d5c37dbb24bc66898ac9542b2720abc9b650e110fa9c253ae0920c5196358",
  "brand/apple-touch-icon.png": "f4951086a638553b757af98e0d165055bbcbb8dcb72a7ebdaad2d65da978e3d4",
  "brand/icon-192.png": "fdd23aa74c0e1277e2b9c245778dac85369e12ba5fc6e6e9f7aced2a82184d25",
  "brand/icon-32.png": "009bcd6cc63683832f64297444d86b9f805e2ce343f518df7c700286ca093c6c",
  "brand/icon-512.png": "daee713ab72388f6eba216512054cdc0c2bb79a46e381723f1b16b5fe1a9570e",
  "brand/icon-maskable-512.png": "514717aebea384faa6cc1f98d65d9497d00ac33e09f2cad7e063c16d18a4ced3",
  "brand/jolu-preview.png": "0729d4fb88742ae14a15d58a6dc9ffd54c304d59b1578834c5a8cc62fb0aff72",
  "manifest.webmanifest": "1a0a0c8715183a12c33420fdebe7d33b3132602a37ec17d1d04bda92468ada77",
  "file.svg": "2b67812c325c199a02536cdbeea0c593a72f707d323b72ee3e08dbab06753bd4",
  "globe.svg": "b614b9bf183925957661ac851498fe1d8029fd43a62fbfed86f9e2624a57e7cf",
  "next.svg": "55995dfad6ecb4945a1e856ddca03c5e16aa5bf13fd21b4df6a74ae79357bcfc",
  "vercel.svg": "f081337b2fee635b455b63275406a3e7f39d6a014e25ad90dab5a67e62a12ac4",
  "window.svg": "644768c4aaeb4767bce293344eeb0c125fb804a94d801440424072202d85e3a1",
  "placeholder.svg": "64badf7aabda0b9630b87020ffb6095cb858ccbcf66b355c2aa08b1063954d3b",
}

/** The only literal brand path code may hard-code outside the registries. */
export const BRAND_PATHS_IN_CODE = new Set(["/lovable-uploads/jolu-logo.png"])
/** Hash-only manifest of withheld media (sha256, neutral index, kind). The originals are NOT in the repository. */
export const WITHHELD_MANIFEST = "docs/assets/WITHHELD-MANIFEST.sha256"
export const WITHHELD_COUNT = 66
const SCAN_SKIP = new Set([".git", "node_modules", ".next", ".vercel", "out", "coverage"])
export const CODE_DIRS = ["app", "components", "lib"]
export const REGISTRY_FILES = new Set(["lib/photo-library.ts", "lib/document-library.ts"])

export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex")

export function walk(dir, base = dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full, base))
    else out.push(path.relative(base, full).split(path.sep).join("/"))
  }
  return out
}

/** Every file in the working tree except VCS/dependency/build directories. */
export function walkAll(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    if (SCAN_SKIP.has(name)) continue
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walkAll(full, base))
    else if (st.isFile()) out.push(path.relative(base, full).split(path.sep).join("/"))
  }
  return out
}

export function isClearedPhotoEntry(entry) {
  return Object.values(entry.clearance).every((i) =>
    i.status === "approved" ? true : i.status === "not-applicable" ? Boolean(i.evidence?.trim()) : false)
}
export function isClearedDocEntry(entry) {
  return Object.values(entry.clearance).every((i) =>
    i.status === "pending" ? false : Boolean(i.evidence?.trim()))
}

/**
 * photos: PHOTO_LIBRARY object; docs: DOCUMENT_LIBRARY object.
 * Returns an array of violation strings (empty means pass).
 */
export function checkAssets(root, { photos, docs }, opts = {}) {
  const v = []
  const pub = path.join(root, "public")
  const files = walk(pub)

  // Registry-approved served paths (must live under /cleared/).
  const approved = new Set()
  const entries = [
    ...Object.values(photos).map((e) => ({ kind: "photo", id: e.id, src: e.src, cleared: isClearedPhotoEntry(e) })),
    ...Object.values(docs).map((e) => ({ kind: "document", id: e.id, src: e.href, cleared: isClearedDocEntry(e) })),
  ]
  for (const e of entries) {
    const rootOk = e.kind === "photo" ? /^\/cleared\/(?!docs\/)[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(e.src) : /^\/cleared\/docs\/[A-Za-z0-9._-]+\.pdf$/.test(e.src)
    if (!rootOk || e.src.includes("..")) v.push(`${e.kind} ${e.id}: src ${e.src} is not inside the allowed cleared directory`)
    if (e.cleared) approved.add(e.src.slice(1))
    else if (files.includes(e.src.replace(/^\//, "")) || existsSync(path.join(pub, e.src))) {
      v.push(`${e.kind} ${e.id}: not fully cleared but its file exists under public/ (${e.src})`)
    }
  }

  for (const f of files) {
    if (!MEDIA_EXT.test(f)) continue
    if (Object.hasOwn(BRAND_ALLOWLIST, f)) {
      if (sha256(path.join(pub, f)) !== BRAND_ALLOWLIST[f]) v.push(`public/${f}: allowlisted brand asset content changed (sha256 mismatch)`)
      continue
    }
    if (f.startsWith("cleared/") && approved.has(f)) continue
    v.push(`public/${f}: media/PDF file is neither an allowlisted brand asset nor an approved registry asset under public/cleared/`)
  }

  // Withheld-file guard: the manifest is hash-only; no withheld file may reappear anywhere in the tree.
  const manifestFile = path.join(root, WITHHELD_MANIFEST)
  if (!existsSync(manifestFile)) v.push(`${WITHHELD_MANIFEST} is missing`)
  else {
    const hashes = new Map() // sha256 -> index (several indices may share one hash: byte-identical duplicates)
    let entries = 0
    for (const line of readFileSync(manifestFile, "utf8").split("\n").filter((l) => l && !l.startsWith("#"))) {
      const m = /^([0-9a-f]{64}) {2}(W\d{3}) {2}[a-z-]+$/.exec(line)
      if (!m) { v.push(`manifest: malformed line ${JSON.stringify(line.slice(0, 80))}`); continue }
      entries++
      hashes.set(m[1], [hashes.get(m[1]), m[2]].filter(Boolean).join("="))
    }
    if (entries !== (opts.withheldCount ?? WITHHELD_COUNT)) v.push(`manifest: expected ${opts.withheldCount ?? WITHHELD_COUNT} entries, found ${entries}`)
    for (const f of walkAll(root)) {
      const idx = hashes.get(sha256(path.join(root, f)))
      if (idx) v.push(`${f}: content matches withheld file ${idx} (withheld media must not reappear in the repository)`)
    }
  }

  // Hard-coded asset paths in code.
  for (const dir of CODE_DIRS) {
    for (const rel of walk(path.join(root, dir))) {
      if (!/\.(ts|tsx|js|jsx|mjs|css)$/.test(rel)) continue
      const key = `${dir}/${rel}`
      if (REGISTRY_FILES.has(key)) continue
      const src = readFileSync(path.join(root, key), "utf8")
      const hits = src.match(/["'`(][^"'`()\s]*(?:lovable-uploads|quarantine|\/cleared\/)[^"'`()\s]*/g) ?? []
      for (const h of hits) {
        const p = h.slice(1)
        if (!BRAND_PATHS_IN_CODE.has(p)) v.push(`${key}: hard-coded asset path ${p} outside the registry`)
      }
      const bare = src.match(/lovable-uploads|quarantine\/|\/cleared\//g)
      if (bare && !hits.length) v.push(`${key}: references lovable-uploads/quarantine/cleared outside the registry`)
    }
  }
  return v
}
