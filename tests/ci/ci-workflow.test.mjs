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

// ---- Mandatory real-Redis execution ----
// Pure check used by the real tests and by the mutation tests below.
function redisGateProblems(text) {
  const at = (n) => text.indexOf(n)
  const problems = []
  const install = at("apt-get install -y --no-install-recommends redis-server")
  const unit = at("run: pnpm test")
  const gate = at("Real-Redis suite must run (not skip)")
  const guard2 = text.indexOf("node scripts/seo/frozen-files.mjs --check", text.indexOf("node scripts/seo/frozen-files.mjs --check") + 1)
  if (install < 0) problems.push("redis install step missing")
  if (install >= 0 && !(install > text.indexOf("git ls-files") && install < unit)) problems.push("redis install must follow the tracked-files check and precede the unit tests")
  if (install >= 0 && !(install > text.indexOf("node scripts/seo/frozen-files.mjs --check"))) problems.push("redis install must follow the frozen-files guard")
  if (!/REQUIRE_REAL_REDIS: "1"/.test(text)) problems.push("REQUIRE_REAL_REDIS env missing")
  if (gate < 0) problems.push("real-redis gate step missing")
  if (gate >= 0 && !(gate > unit)) problems.push("gate must run after the unit tests")
  if (gate >= 0 && !text.includes("tests/enquiry/finalize-script.redis.test.mjs")) problems.push("gate must run the redis test file")
  if (gate >= 0 && !(text.includes("# tests 7$") && text.includes("# skipped 0$"))) problems.push("gate must assert tests 7 and skipped 0")
  if (gate >= 0 && !text.includes("set -o pipefail")) problems.push("gate must use pipefail")
  if (!(guard2 > 0 && guard2 < (install < 0 ? Infinity : install) || guard2 < unit)) problems.push("frozen guard order broken")
  return problems
}

test("CI installs Redis from apt before the unit tests and gates on the real-Redis suite actually running", () => {
  assert.deepEqual(redisGateProblems(ci), [])
  assert.ok(!/uses: [^\n]*redis/i.test(ci), "no third-party redis action")
  assert.ok(!/^\s+services:/m.test(ci), "no service containers")
  assert.ok(order("apt-get install -y --no-install-recommends redis-server") < order("run: pnpm test"))
  assert.ok(order("run: pnpm test") < order("Real-Redis suite must run (not skip)"))
  assert.ok(order("Real-Redis suite must run (not skip)") < order("pnpm check:assets"))
})

test("mutation: removing the Redis install, the env gate or the post-test gate is detected", () => {
  const cut = (from, to) => { const a = ci.indexOf(from), b = ci.indexOf(to); assert.ok(a > -1 && b > a, from); return ci.slice(0, a) + ci.slice(b) }
  assert.ok(redisGateProblems(cut("      # The finalize-script tests run", "      - name: Unit tests")).length > 0, "install removed")
  assert.ok(redisGateProblems(ci.replace('REQUIRE_REAL_REDIS: "1"', "")).length > 0, "env removed")
  assert.ok(redisGateProblems(cut("      # Mandatory-Redis gate", "      # Fails if unapproved")).length > 0, "gate removed")
  assert.ok(redisGateProblems(ci.replace("# skipped 0$", "")).length > 0, "skipped assertion removed")
  assert.ok(redisGateProblems(ci.replace("set -o pipefail", "")).length > 0, "pipefail removed")
  // Moving the install after the unit tests is detected.
  const moved = cut("      # The finalize-script tests run", "      - name: Unit tests") + "\n      - run: sudo apt-get install -y --no-install-recommends redis-server\n"
  assert.ok(redisGateProblems(moved).length > 0, "install moved late")
})

test("the real-Redis test file fails (not skips) when REQUIRE_REAL_REDIS=1 and redis-server is absent", async () => {
  const { spawnSync } = await import("node:child_process")
  const { mkdtempSync, symlinkSync } = await import("node:fs")
  const { tmpdir } = await import("node:os")
  const bin = mkdtempSync(path.join(tmpdir(), "nored-"))
  symlinkSync(process.execPath, path.join(bin, "node"))
  const src = readFileSync(path.resolve(import.meta.dirname, "../enquiry/finalize-script.redis.test.mjs"), "utf8")
  assert.match(src, /REQUIRE_REAL_REDIS === "1"[\s\S]*throw new Error/)
  const r = spawnSync(process.execPath, ["--import", "./tests/register.mjs", "--test", "tests/enquiry/finalize-script.redis.test.mjs"], {
    cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8",
    env: { ...process.env, NODE_TEST_CONTEXT: undefined, REQUIRE_REAL_REDIS: "1", PATH: bin },
  })
  assert.notEqual(r.status, 0, "must fail without redis-server")
  assert.match(r.stdout + r.stderr, /REQUIRE_REAL_REDIS=1 \(or CI=true\) but redis-server is not on PATH/)
})
