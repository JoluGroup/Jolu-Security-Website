// Read-only evidence-freshness check. Prints findings and exits non-zero on actionable risk. It never publishes,
// unpublishes, writes files or contacts a network.
//
//   node --import ./tests/register.mjs scripts/check-evidence-freshness.mjs [--today=YYYY-MM-DD] [--strict] [--format=text|json|markdown]
//
//   (default)  exit 1 on any ERROR; warnings are printed (and annotated in GitHub Actions) but do not fail the run
//   --strict   exit 1 on any ERROR or WARNING (used by the scheduled workflow so that upcoming risks turn the run red)
//   --format   text (default), json (machine-readable, one object), markdown (for the Actions job summary:
//              `... --format=markdown >> "$GITHUB_STEP_SUMMARY"`; the script itself writes no files)
//
// (The register import maps the "@/" alias so the TypeScript sources load without a build step.)
const args = process.argv.slice(2)
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const today = arg("today") ?? new Date().toISOString().slice(0, 10)
const strict = args.includes("--strict")
const format = arg("format") ?? "text"
if (!["text", "json", "markdown"].includes(format)) {
  console.error(`unknown --format "${format}" (use text, json or markdown)`)
  process.exit(2)
}

const { checkEvidenceFreshness, exitCodeFor } = await import("@/lib/seo/evidence-monitor")
const { ALL_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { defaultDeps } = await import("@/lib/seo/publication-deps")

const report = checkEvidenceFreshness({ records: ALL_PAGE_RECORDS, deps: defaultDeps(), today })
const status = exitCodeFor(report, strict)
const headline = `Evidence freshness as of ${today}: ${report.publishedPaths.length} published page(s), ${report.errors} error(s), ${report.warnings} warning(s)${strict ? " [strict]" : ""}.`
// GitHub workflow commands: the message must escape %, CR and LF.
const escape = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ")

if (format === "json") {
  console.log(JSON.stringify({ today, strict, exitCode: status, errors: report.errors, warnings: report.warnings, publishedPaths: report.publishedPaths, findings: report.findings }, null, 2))
} else if (format === "markdown") {
  console.log(`## ${headline}\n`)
  console.log(status === 0 ? "**Result: pass.**\n" : "**Result: ACTION NEEDED** (see the runbook: docs/seo/evidence-expiry-runbook.md).\n")
  if (report.findings.length > 0) {
    console.log("| Level | Code | Page | Evidence | Detail |\n|---|---|---|---|---|")
    for (const f of report.findings) console.log(`| ${f.level.toUpperCase()} | ${f.code} | ${cell(f.path ?? "")} | ${cell(f.evidenceId ?? "")} | ${cell(f.message)} |`)
  }
  console.log("\nThis check only reads the repository. It does not publish, unpublish, deploy or change anything.")
} else {
  const annotate = process.env.GITHUB_ACTIONS === "true"
  for (const f of report.findings) {
    const tag = f.level === "error" ? "ERROR" : f.level === "warning" ? "WARNING" : "NOTE"
    console.log(annotate && f.level !== "note" ? `::${f.level}::${escape(`[${f.code}] ${f.message}`)}` : `${tag} [${f.code}]: ${f.message}`)
  }
  console.log(headline)
}
process.exit(status)
