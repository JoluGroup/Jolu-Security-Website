// Frozen-files guard: a deterministic, git-independent protection for the claims, enquiry and
// publication-gate files.
//
// Design
//   * The approved content of every protected file is recorded as a SHA-256 digest in
//     tests/seo/frozen-files.manifest.json, committed with the code.
//   * verifyFrozen() hashes the files on disk and compares them with the manifest. It needs no git
//     history, no network, no reference commit and no CI-specific settings, so it behaves the same in
//     fresh clones, shallow checkouts and pull-request runs.
//   * It FAILS CLOSED: a missing, unreadable, malformed or incomplete manifest is a failure, never a skip.
//   * Coverage cannot shrink quietly: the set of protected paths is derived from the patterns below by
//     walking the tree, and the manifest must list exactly that set (new, deleted and modified files all fail).
//   * A legitimate change to a protected file is made by running
//         node scripts/seo/update-frozen-manifest.mjs
//     which rewrites the manifest. The manifest change then appears in the pull request diff, where a
//     reviewer (ideally a code owner) must approve it. This file and the tests are themselves protected.
import { createHash } from "node:crypto"
import { lstatSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"

export const MANIFEST_PATH = "tests/seo/frozen-files.manifest.json"

// Paths (posix, repo-relative) that are frozen. Narrow on purpose: content files (copy, offices,
// categories, pages) are NOT frozen here; they stay protected by their own evidence gates and tests.
export const PROTECTED = [
  /^app\//, // every route, layout and page: a new page or route must be reviewed and added to the manifest
  /^[^/]+$/, // every root-level file (configs such as .npmrc, eslint.config.*, postcss.config.*, .env*, .pnpmfile.*)
  /^lib\/enquiry\//,
  /^components\/enquiry-form\.tsx$/,
  /^lib\/claims\.ts$/,
  /^app\/(page|layout|sitemap|robots)\.tsx?$/,
  /^app\/blog\//,
  /^app\/(.*\/)?(route|proxy|middleware)\.[cm]?[jt]sx?$/, // any route handler, wherever it is added
  /^(proxy|middleware)\.[cm]?[jt]sx?$/,
  /^package\.json$/, // holds the test, build and asset-check scripts
  /^pnpm-workspace\.yaml$/,
  /^next\.config\.[cm]?[jt]s$/,
  /^lib\/seo\/(page-models|evidence-ledger|publication-requirements|publication-manifest|publication-deps|publication-gate|page-records|page-resolve|page-json-ld|page-metadata|freeze|digest|text-policy|claim-scope|claim-classifier|evidence-monitor|release-gates)\.ts$/,
  /^components\/pages\//,
  /^scripts\/check-evidence-freshness\.mjs$/,
  /^scripts\/seo\/(frozen-files|update-frozen-manifest)\.mjs$/,
  /^\.github\/workflows\//,
  // All tests (so a protection cannot be switched off by deleting or weakening its tests), except the manifest itself,
  // which cannot contain its own digest.
  /^tests\/(?!seo\/frozen-files\.manifest\.json$)/,
  /^scripts\/(assets|enquiry)\//,
  /^(eslint\.config\.mjs|tsconfig\.json|pnpm-lock\.yaml)$/,
]

// Files that must always be covered, so an emptied or truncated manifest cannot pass.
export const REQUIRED = [
  "app/api/enquiry/route.ts",
  "lib/enquiry/deliver.ts",
  "lib/enquiry/rate-limit.ts",
  "lib/enquiry/dedup.ts",
  "lib/enquiry/schema.ts",
  "components/enquiry-form.tsx",
  "lib/claims.ts",
  "app/page.tsx",
  "app/layout.tsx",
  "next.config.ts",
  "package.json",
  "tests/register.mjs",
  "tests/loader.mjs",
  "eslint.config.mjs",
  "tsconfig.json",
  "pnpm-lock.yaml",
  "scripts/assets/check-public-assets.mjs",
  "scripts/assets/asset-rules.mjs",
  "tests/seo/frozen-files-mutation.test.mjs",
  "tests/enquiry/route.test.mjs",
  "lib/seo/publication-gate.ts",
  "lib/seo/publication-requirements.ts",
  "lib/seo/publication-manifest.ts",
  "lib/seo/evidence-ledger.ts",
  "lib/seo/page-records.ts",
  ".github/workflows/ci.yml",
  "tests/seo/page-gate.test.mjs",
  "tests/seo/frozen-files.test.mjs",
  "scripts/seo/frozen-files.mjs",
]

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "coverage", ".turbo", ".vercel"])
// Generated or machine-local files at the repository root that are never committed. Nothing else is exempt.
const IGNORED_ROOT = [/^\.git$/, /^next-env\.d\.ts$/, /^tsconfig\.tsbuildinfo$/, /^\.DS_Store$/, /^\.env\.local$/, /^\.env\.[^/]*\.local$/, /^[^/]*\.log$/]

function walk(root, rel = "", out = []) {
  for (const entry of readdirSync(path.join(root, rel), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Build and dependency folders are skipped ONLY at the repository root, so a folder with one of these
      // names inside a protected area (for example app/api/coverage/) is still scanned.
      if (rel === "" && SKIP_DIRS.has(entry.name)) continue
      walk(root, rel ? `${rel}/${entry.name}` : entry.name, out)
    } else {
      out.push(rel ? `${rel}/${entry.name}` : entry.name)
    }
  }
  return out
}

export function listProtected(root) {
  return walk(root).filter((p) => !(p.indexOf("/") === -1 && IGNORED_ROOT.some((re) => re.test(p))) && PROTECTED.some((re) => re.test(p))).sort()
}

export function sha256File(root, rel) {
  return createHash("sha256").update(readFileSync(path.join(root, rel))).digest("hex")
}

export function buildManifest(root) {
  const files = {}
  for (const rel of listProtected(root)) files[rel] = sha256File(root, rel)
  return { version: 1, algorithm: "sha256", files }
}

export function serializeManifest(manifest) {
  const sorted = Object.fromEntries(Object.keys(manifest.files).sort().map((k) => [k, manifest.files[k]]))
  return JSON.stringify({ version: 1, algorithm: "sha256", files: sorted }, null, 2) + "\n"
}

// Returns a list of problem strings. An empty list means every protected file is exactly as approved.
export function verifyFrozen(root) {
  const problems = []
  let manifest
  try {
    manifest = JSON.parse(readFileSync(path.join(root, MANIFEST_PATH), "utf8"))
  } catch {
    return [`manifest missing or unreadable (${MANIFEST_PATH}): fail closed`]
  }
  if (!manifest || typeof manifest !== "object" || manifest.version !== 1 || manifest.algorithm !== "sha256" ||
      !manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) {
    return ["manifest malformed: fail closed"]
  }
  const recorded = manifest.files
  for (const [rel, hash] of Object.entries(recorded)) {
    if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) problems.push(`manifest entry has an invalid digest: ${rel}`)
  }
  for (const rel of REQUIRED) {
    if (!(rel in recorded)) problems.push(`required protected file is not covered by the manifest: ${rel}`)
  }
  const actual = listProtected(root)
  const actualSet = new Set(actual)
  for (const rel of actual) {
    let st
    try { st = lstatSync(path.join(root, rel)) } catch { problems.push(`protected file unreadable: ${rel}`); continue }
    if (st.isSymbolicLink()) { problems.push(`protected file is a symbolic link: ${rel}`); continue }
    if (!(rel in recorded)) { problems.push(`new protected file not in manifest: ${rel}`); continue }
    if (/^[0-9a-f]{64}$/.test(String(recorded[rel])) && sha256File(root, rel) !== recorded[rel]) problems.push(`protected file modified: ${rel}`)
  }
  for (const rel of Object.keys(recorded)) {
    if (!actualSet.has(rel)) problems.push(`protected file deleted or no longer protected: ${rel}`)
  }
  return problems
}

// Command line: `node scripts/seo/frozen-files.mjs --check`. CI runs this directly, so the guard still runs
// (and still fails) even if its test files are deleted: those files are themselves in the manifest.
import { fileURLToPath } from "node:url"
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes("--check")) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  const problems = verifyFrozen(root)
  if (problems.length) {
    console.error(`Frozen-files check FAILED (${problems.length}):\n  ${problems.join("\n  ")}\nIf the change is intended and approved, run: node scripts/seo/update-frozen-manifest.mjs`)
    process.exit(1)
  }
  console.log(`Frozen-files check passed (${Object.keys(JSON.parse(readFileSync(path.join(root, MANIFEST_PATH), "utf8")).files).length} files).`)
}
