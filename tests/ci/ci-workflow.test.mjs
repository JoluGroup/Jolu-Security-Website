// CI security controls: the existing workflow must keep read-only permissions, no secrets and no deployment,
// and must run the asset-security check as part of the single required job.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

const ci = readFileSync(path.resolve(import.meta.dirname, "../../.github/workflows/ci.yml"), "utf8")
const order = (needle) => { const i = ci.indexOf(needle); assert.ok(i > -1, needle); return i }

test("CI keeps its single required job name and pull_request trigger", () => {
  assert.match(ci, /name: Test, typecheck, lint and build/)
  assert.match(ci, /\non:\n\s+pull_request:/)
  assert.ok(!/\bpush:|workflow_dispatch|schedule:|pull_request_target/.test(ci))
})

test("CI is read-only with no secrets and no deployment", () => {
  assert.match(ci, /permissions:\n\s+contents: read/)
  assert.ok(!/(write|admin)\b/.test(ci.replace(/read-only|write access/gi, "")))
  assert.ok(!/secrets\./.test(ci))
  // The tracked-files grep legitimately names ".vercel"; everything else must not mention deployment.
  assert.ok(!/(vercel|deploy|gh-pages|publish)/i.test(ci.replace(/Read-only token, no secrets, no deployment\./, "").replace(/.*git ls-files.*\n/, "")))
})

test("CI runs the asset-security check in the required job, after install and before the build", () => {
  assert.match(ci, /run: pnpm check:assets\b/)
  assert.ok(order("pnpm install --frozen-lockfile") < order("pnpm check:assets"))
  assert.ok(order("pnpm check:assets") < order("pnpm build"))
})

test("the existing stages are preserved in order", () => {
  const steps = ["pnpm install --frozen-lockfile", "pnpm test", "pnpm check:assets", "pnpm exec next typegen", "pnpm exec tsc --noEmit", "pnpm lint", "pnpm build"]
  for (let i = 1; i < steps.length; i++) assert.ok(order(steps[i - 1]) < order(steps[i]), steps[i])
})

test("CI runs the frozen-files guard directly: before any install or package script, and again after install", () => {
  const guard = "node scripts/seo/frozen-files.mjs --check"
  const first = ci.indexOf(guard), second = ci.indexOf(guard, first + 1)
  assert.ok(first > -1 && second > first, "guard must appear twice")
  assert.ok(first < order("pnpm/action-setup"))
  assert.ok(first < order("pnpm install --frozen-lockfile"))
  assert.ok(second > order("pnpm install --frozen-lockfile") && second < order("pnpm test"))
})

test("CI refuses tracked dependency, build and machine-local files, before any install or script runs", () => {
  for (const needle of ["node_modules", "\\.next", "\\.env\\.local", "tsconfig\\.tsbuildinfo", "next-env\\.d\\.ts", "\\.DS_Store", "\\.log$"]) assert.ok(ci.includes(needle), needle)
  assert.ok(order("git ls-files") < order("pnpm/action-setup"))
  assert.ok(order("git ls-files") < order("pnpm install --frozen-lockfile"))
})
