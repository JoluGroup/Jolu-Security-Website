// Reads a JSON array of keyword strings on stdin and prints {results, rules, judgment} as JSON.
// Used by scripts/seo/build-seo-data.py so the generator, the docs and the app share ONE classifier implementation.
// Run through the repo's TypeScript loader:  node --import ./tests/register.mjs scripts/seo/classify-cli.mjs
import { readFileSync } from "node:fs"

const { classifyKeyword, CLAIM_RULES, JUDGMENT_RULES } = await import("@/lib/seo/claim-classifier")
const keywords = JSON.parse(readFileSync(0, "utf8"))
process.stdout.write(
  JSON.stringify({
    results: keywords.map((k) => classifyKeyword(k)),
    rules: CLAIM_RULES.map((r) => ({ category: r.category, pattern: r.pattern.source, flags: r.pattern.flags })),
    judgment: JUDGMENT_RULES.map((j) => ({ id: j.id, category: j.category, decision: j.decision, pattern: j.pattern.source, flags: j.pattern.flags, reason: j.reason })),
  }),
)
