import assert from "node:assert/strict"
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { BRAND_ALLOWLIST, WITHHELD_COUNT, WITHHELD_MANIFEST, checkAssets, walk, walkAll } from "../../scripts/assets/asset-rules.mjs"

const { PHOTO_LIBRARY, isPhotoCleared, isClearedSrc, assertClearedSrc, resolvePhoto } = await import("@/lib/photo-library")
const { DOCUMENT_LIBRARY, clearedDocuments, isClearedDocHref } = await import("@/lib/document-library")

const ROOT = path.resolve(import.meta.dirname, "../..")
const real = () => checkAssets(ROOT, { photos: PHOTO_LIBRARY, docs: DOCUMENT_LIBRARY })

describe("real repository", () => {
  it("passes every asset rule", () => assert.deepEqual(real(), []))

  it("public/ holds only the allowlisted brand assets plus approved cleared files", () => {
    const media = walk(path.join(ROOT, "public"))
    assert.deepEqual(media.sort(), Object.keys(BRAND_ALLOWLIST).sort())
  })

  it("no PDF or team portrait is reachable under public/", () => {
    assert.ok(!walk(path.join(ROOT, "public")).some((f) => /\.pdf$/i.test(f) || f.includes("team/")))
  })

  it("withheld originals are absent from the tree and the hash-only manifest lists them", () => {
    assert.ok(!existsSync(path.join(ROOT, "quarantine")), "no quarantine directory may exist")
    const lines = readFileSync(path.join(ROOT, WITHHELD_MANIFEST), "utf8").split("\n").filter((l) => l && !l.startsWith("#"))
    assert.equal(lines.length, WITHHELD_COUNT)
    for (const l of lines) assert.match(l, /^[0-9a-f]{64} {2}W\d{3} {2}[a-z-]+$/)
    const hashes = new Set(lines.map((l) => l.slice(0, 64))) // 64 distinct hashes: 2 byte-identical duplicate pairs
    for (const f of walkAll(ROOT)) assert.ok(!hashes.has(createHash("sha256").update(readFileSync(path.join(ROOT, f))).digest("hex")), `${f} matches a withheld hash`)
  })

  it("every registry src points into /cleared/ and nothing is approved yet", () => {
    for (const e of Object.values(PHOTO_LIBRARY)) {
      assert.ok(isClearedSrc(e.src), e.id)
      assert.equal(isPhotoCleared(e), false, `${e.id} unexpectedly cleared; update this test with the evidence trail`)
      assert.equal(resolvePhoto(e.id), null)
    }
    for (const e of Object.values(DOCUMENT_LIBRARY)) assert.ok(isClearedDocHref(e.href), e.id)
    assert.deepEqual(clearedDocuments(), [])
  })

  it("src validator rejects the old served path, traversal and other roots", () => {
    for (const bad of ["/lovable-uploads/hero1.jpeg", "/cleared/../x.jpg", "/other/a.jpg", "cleared/a.jpg", "/cleared/", "https://x/cleared/a.jpg"]) {
      assert.equal(isClearedSrc(bad), false, bad)
      assert.throws(() => assertClearedSrc(bad))
    }
    assert.equal(isClearedSrc("/cleared/gallery/1.jpeg"), true)
  })
})

describe("rule mutations (temporary copy of the repo layout)", () => {
  function sandbox() {
    const dir = mkdtempSync(path.join(tmpdir(), "assets-"))
    mkdirSync(path.join(dir, "public/lovable-uploads"), { recursive: true })
    for (const f of Object.keys(BRAND_ALLOWLIST)) {
      mkdirSync(path.dirname(path.join(dir, "public", f)), { recursive: true })
      cpSync(path.join(ROOT, "public", f), path.join(dir, "public", f))
    }
    mkdirSync(path.join(dir, "docs/assets"), { recursive: true })
    cpSync(path.join(ROOT, WITHHELD_MANIFEST), path.join(dir, WITHHELD_MANIFEST))
    for (const d of ["app", "components", "lib"]) mkdirSync(path.join(dir, d), { recursive: true })
    return dir
  }
  const run = (dir, photos = PHOTO_LIBRARY, docs = DOCUMENT_LIBRARY) => checkAssets(dir, { photos, docs })
  const cleared = () => ({ ownerApproval: { status: "approved", evidence: "e" }, personalDataAndConsent: { status: "approved", evidence: "e" }, copyrightAndImages: { status: "approved", evidence: "e" }, thirdPartyMarksAndClaims: { status: "approved", evidence: "e" } })
  const photoCleared = () => ({ employeeConsent: { status: "approved", evidence: null }, photographerCopyright: { status: "approved", evidence: null }, venuePermission: { status: "approved", evidence: null }, thirdPartyMarks: { status: "approved", evidence: null } })

  it("sandbox baseline passes", () => {
    const dir = sandbox()
    try { assert.deepEqual(run(dir), []) } finally { rmSync(dir, { recursive: true }) }
  })

  it("fails on an unlisted image, PDF or video under public/", () => {
    const dir = sandbox()
    try {
      for (const f of ["lovable-uploads/x.jpg", "a.pdf", "v.mp4", "s.mp3", "cleared/y.png"]) {
        mkdirSync(path.dirname(path.join(dir, "public", f)), { recursive: true })
        writeFileSync(path.join(dir, "public", f), "x")
      }
      const v = run(dir)
      for (const f of ["lovable-uploads/x.jpg", "a.pdf", "v.mp4", "s.mp3", "cleared/y.png"]) assert.ok(v.some((x) => x.includes(`public/${f}`)), f)
    } finally { rmSync(dir, { recursive: true }) }
  })

  it("fails when an uncleared entry's file exists under public/, passes when fully approved", () => {
    const dir = sandbox()
    try {
      mkdirSync(path.join(dir, "public/cleared"), { recursive: true })
      writeFileSync(path.join(dir, "public/cleared/a.jpg"), "x")
      const mk = (clearance) => ({ p: { id: "p", src: "/cleared/a.jpg", clearance } })
      assert.ok(run(dir, mk({ ...photoCleared(), venuePermission: { status: "pending", evidence: null } }), {}).some((x) => /not fully cleared but its file exists/.test(x)))
      assert.deepEqual(run(dir, mk(photoCleared()), {}), [])
    } finally { rmSync(dir, { recursive: true }) }
  })

  it("fails for approved entries with src outside /cleared/, and for an approved doc outside /cleared/docs", () => {
    const dir = sandbox()
    try {
      assert.ok(run(dir, { p: { id: "p", src: "/lovable-uploads/a.jpg", clearance: photoCleared() } }, {}).length > 0)
      assert.ok(run(dir, {}, { d: { id: "d", href: "/cleared/brochure.pdf", clearance: cleared() } }).length > 0)
    } finally { rmSync(dir, { recursive: true }) }
  })

  it("fails when a withheld file reappears anywhere in the tree, under any name", () => {
    const dir = sandbox()
    try {
      const probe = "withheld probe content"
      const h = createHash("sha256").update(probe).digest("hex")
      writeFileSync(path.join(dir, WITHHELD_MANIFEST), `${h}  W001  people-photo\n`)
      assert.deepEqual(checkAssets(dir, { photos: PHOTO_LIBRARY, docs: DOCUMENT_LIBRARY }, { withheldCount: 1 }), [])
      for (const f of ["docs/renamed-copy.txt", "quarantine/uncleared-assets/x.bin", "public/cleared/odd.dat"]) {
        mkdirSync(path.dirname(path.join(dir, f)), { recursive: true })
        writeFileSync(path.join(dir, f), probe)
        assert.ok(checkAssets(dir, { photos: PHOTO_LIBRARY, docs: DOCUMENT_LIBRARY }, { withheldCount: 1 }).some((x) => x.startsWith(`${f}: content matches withheld file W001`)), f)
        rmSync(path.join(dir, f))
      }
    } finally { rmSync(dir, { recursive: true }) }
  })

  it("fails on a missing, malformed or wrong-sized manifest", () => {
    const dir = sandbox()
    try {
      writeFileSync(path.join(dir, WITHHELD_MANIFEST), "not a hash line\n")
      assert.ok(run(dir).some((x) => /malformed line/.test(x)))
      assert.ok(run(dir).some((x) => /expected 66 entries/.test(x)))
      rmSync(path.join(dir, WITHHELD_MANIFEST))
      assert.ok(run(dir).some((x) => /is missing/.test(x)))
    } finally { rmSync(dir, { recursive: true }) }
  })

  it("fails when a component hard-codes a lovable-uploads, quarantine or cleared path", () => {
    for (const snippet of ['export const a = "/lovable-uploads/hero1.jpeg"', 'const b = "quarantine/uncleared-assets/x.jpg"', "const c = `/cleared/gallery/1.jpeg`"]) {
      const dir = sandbox()
      try {
        writeFileSync(path.join(dir, "components/x.tsx"), snippet)
        assert.ok(run(dir).some((x) => /components\/x\.tsx/.test(x)), snippet)
        rmSync(path.join(dir, "components/x.tsx"))
        writeFileSync(path.join(dir, "components/ok.tsx"), 'const logo = "/lovable-uploads/jolu-logo.png"')
        assert.deepEqual(run(dir), [])
      } finally { rmSync(dir, { recursive: true }) }
    }
  })

  it("fails when the logo allowlist entry is swapped for different content", () => {
    const dir = sandbox()
    try {
      writeFileSync(path.join(dir, "public/lovable-uploads/jolu-logo.png"), "different")
      assert.ok(run(dir).some((x) => /sha256 mismatch/.test(x)))
    } finally { rmSync(dir, { recursive: true }) }
  })
})
