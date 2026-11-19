// Read-only evidence-freshness check. Prints findings (GitHub annotations when run in Actions) and exits 1 on any
// ERROR. It never publishes, unpublishes, writes files or contacts a network.
//   node --import ./tests/register.mjs scripts/check-evidence-freshness.mjs [--today=YYYY-MM-DD]
// (The register import maps the "@/" alias so the TypeScript sources load without a build step.)
const arg = process.argv.find((a) => a.startsWith("--today="))
const today = arg ? arg.slice("--today=".length) : new Date().toISOString().slice(0, 10)

const { checkEvidenceFreshness } = await import("@/lib/seo/evidence-monitor")
const { ALL_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { defaultDeps } = await import("@/lib/seo/publication-deps")

const report = checkEvidenceFreshness({ records: ALL_PAGE_RECORDS, deps: defaultDeps(), today })
const annotate = process.env.GITHUB_ACTIONS === "true"
for (const f of report.findings) {
  const tag = f.level === "error" ? "ERROR" : f.level === "warning" ? "WARNING" : "NOTE"
  console.log(annotate && f.level !== "note" ? `::${f.level}::${f.message}` : `${tag}: ${f.message}`)
}
console.log(`Evidence freshness as of ${today}: ${report.publishedPaths.length} published page(s), ${report.errors} error(s), ${report.warnings} warning(s).`)
process.exit(report.errors > 0 ? 1 : 0)
