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
// Pure structural check used by the real test and by the mutation tests below.
// Comments are stripped first (full-line comments only; the gate lines are then matched whole, so a trailing
// comment, `|| true`, `&& true` or any other suffix makes a line fail to match).
const stripComments = (t) => t.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n")
function stepBlock(text, name) {
  const lines = stripComments(text).split("\n")
  const start = lines.findIndex((l) => l.startsWith("      - name: ") && l.includes(name))
  if (start < 0) return null
  let end = lines.findIndex((l, i) => i > start && /^      - /.test(l))
  if (end < 0) end = lines.length
  return lines.slice(start, end)
}
const GATE_NAME = "Real-Redis suite must run (not skip)"
const GATE_ALLOWED = [
  /^      - name: Real-Redis suite must run \(not skip\)$/,
  /^        run: \|$/,
  /^          set -o pipefail$/,
  /^          tap="\$RUNNER_TEMP\/redis-suite\.tap"$/,
  /^          node --import \.\/tests\/register\.mjs --test --test-reporter=tap tests\/enquiry\/finalize-script\.redis\.test\.mjs \| tee "\$tap"$/,
  /^          grep -Eq '\^# tests 7\$' "\$tap" \|\| \{ echo "[^"]*"; exit 1; \}$/,
  /^          grep -Eq '\^# skipped 0\$' "\$tap" \|\| \{ echo "[^"]*"; exit 1; \}$/,
  /^          grep -Eq '\^# fail 0\$' "\$tap" \|\| \{ echo "[^"]*"; exit 1; \}$/,
  /^          rm -f "\$tap"$/,
  /^\s*$/,
]
function redisGateProblems(text) {
  const problems = []
  const at = (n) => text.indexOf(n)
  const code = stripComments(text)
  const ci_ = (n) => code.indexOf(n)
  const install = ci_("apt-get install -y --no-install-recommends redis-server")
  const unit = ci_("run: pnpm test")
  const gate = ci_("- name: " + GATE_NAME)
  const guard1 = ci_("node scripts/seo/frozen-files.mjs --check")
  const guard2 = code.indexOf("node scripts/seo/frozen-files.mjs --check", guard1 + 1)
  if (install < 0) problems.push("redis install step missing")
  if (install >= 0 && !(install > ci_("git ls-files") && install < unit)) problems.push("redis install must follow the tracked-files check and precede the unit tests")
  if (install >= 0 && !(install > guard1)) problems.push("redis install must follow the frozen-files guard")
  if (!(guard2 > 0 && guard2 < install)) problems.push("frozen guard (after install) must precede the redis install")
  // Job-level env must force the real-Redis requirement.
  const head = code.slice(0, code.indexOf("    steps:"))
  if (!/^      REQUIRE_REAL_REDIS: "1"$/m.test(head)) problems.push("job env REQUIRE_REAL_REDIS missing")
  // The unit-test step must not override it (or CI) at step level.
  const unitStep = stepBlock(text, "Unit tests")
  if (!unitStep) problems.push("unit test step missing")
  else if (unitStep.some((l) => /^\s+(env:|if:|continue-on-error:)|REQUIRE_REAL_REDIS|\bCI\b/.test(l))) problems.push("unit step must not override env, condition or continue-on-error")
  else if (!unitStep.some((l) => /^        run: pnpm test$/.test(l))) problems.push("unit step must run pnpm test")
  const gateStep = stepBlock(text, GATE_NAME)
  if (!gateStep) problems.push("real-redis gate step missing")
  else {
    if (!(gate > unit)) problems.push("gate must run after the unit tests")
    if (gateStep.some((l) => /^\s+(if|continue-on-error|env|shell|working-directory|timeout-minutes):/.test(l))) problems.push("gate must have no if, continue-on-error, env or shell override")
    for (const l of gateStep) if (!GATE_ALLOWED.some((re) => re.test(l))) problems.push("unexpected gate line: " + l.trim())
    for (const must of [GATE_ALLOWED[2], GATE_ALLOWED[4], GATE_ALLOWED[5], GATE_ALLOWED[6], GATE_ALLOWED[7]]) if (!gateStep.some((l) => must.test(l))) problems.push("gate missing required line " + must)
    const iNode = gateStep.findIndex((l) => GATE_ALLOWED[4].test(l)), iPipe = gateStep.findIndex((l) => GATE_ALLOWED[2].test(l))
    if (iPipe < 0 || iNode < iPipe) problems.push("pipefail must precede the node pipeline")
  }
  if (gate >= 0 && !(gate < ci_("pnpm check:assets"))) problems.push("gate must precede asset checks")
  void at
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

test("mutation: removing or neutralising the Redis install, the env gate or the post-test gate is detected", () => {
  const cut = (from, to) => { const a = ci.indexOf(from), b = ci.indexOf(to); assert.ok(a > -1 && b > a, from); return ci.slice(0, a) + ci.slice(b) }
  const sub = (from, to) => { assert.ok(ci.includes(from), from); return ci.replace(from, to) }
  const detected = (label, text) => assert.ok(redisGateProblems(text).length > 0, label)
  detected("install removed", cut("      # The finalize-script tests run", "      - name: Unit tests"))
  detected("env removed", sub('REQUIRE_REAL_REDIS: "1"', ""))
  detected("gate removed", cut("      # Mandatory-Redis gate", "      # Fails if unapproved"))
  detected("skipped assertion removed", sub("# skipped 0$", ""))
  detected("pipefail removed", sub("set -o pipefail", ""))
  const moved = cut("      # The finalize-script tests run", "      - name: Unit tests") + "\n      - run: sudo apt-get install -y --no-install-recommends redis-server\n"
  detected("install moved late", moved)
  // Neutralisers found by independent verification.
  detected("&& true on skipped grep", sub(`"$tap" || { echo "Real-Redis suite had skipped tests"; exit 1; }`, `"$tap" && true || { echo "Real-Redis suite had skipped tests"; exit 1; }`))
  detected("|| true on tests-7 grep", sub(`'^# tests 7$' "$tap" ||`, `'^# tests 7$' "$tap" || true; false ||`))
  detected("|| true after node pipeline", sub(`| tee "$tap"\n`, `| tee "$tap" || true\n`))
  detected("continue-on-error on gate", sub("      - name: Real-Redis suite must run (not skip)\n", "      - name: Real-Redis suite must run (not skip)\n        continue-on-error: true\n"))
  detected("if: false on gate", sub("      - name: Real-Redis suite must run (not skip)\n", "      - name: Real-Redis suite must run (not skip)\n        if: false\n"))
  detected("unit step overrides env", sub("      - name: Unit tests\n        run: pnpm test\n", '      - name: Unit tests\n        env:\n          REQUIRE_REAL_REDIS: "0"\n        run: pnpm test\n'))
  detected("gate grep exit removed", sub(`|| { echo "Real-Redis suite had failures"; exit 1; }`, ""))
  // A comment containing the expected text cannot satisfy the check.
  const commented = sub("          grep -Eq '^# tests 7$'", "          # grep -Eq '^# tests 7$'")
  detected("tests-7 check commented out", commented)
  const commentOnly = sub(`grep -Eq '^# fail 0$' "$tap" || { echo "Real-Redis suite had failures"; exit 1; }`, `# grep -Eq '^# fail 0$' "$tap" || { echo "Real-Redis suite had failures"; exit 1; }`)
  detected("fail-0 check replaced by a comment", commentOnly)
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
