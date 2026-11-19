// Renders docs/seo/location-pages/ from the typed specs and workbook-derived data. Run scripts/seo/build-location-docs.mjs
// after changing a spec; tests fail if the committed files differ from this output. page-architecture.md is hand-written.
import { CLAIMS } from "@/lib/claims"
import { keywordsForPath, WORKBOOK_KEYWORDS } from "@/lib/seo/keyword-map"
import { COMMON_EVIDENCE, LOCATION_BRIEFS, LOCATION_WORDS, napFor, proposedAdditionRows, serviceCityKeywords, type LocationBrief } from "@/lib/seo/location-briefs"
import { LOCATION_CHECKLIST, STRUCTURED_DATA_RULES } from "@/lib/seo/location-publishing-checklist"
import { PLANNED_PAGES } from "@/lib/seo/planned-pages"
import { SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"
import type { ClaimCategory } from "@/lib/seo/types"

export { WORKBOOK_KEYWORDS }
const SITE = siteConfig.url
const esc = (s: string) => s.replace(/\|/g, "\\|")
const canonical = (path: string) => `${SITE}${path.replace(/\/$/, "")}`
export const briefFileName = (b: LocationBrief) => `briefs/${String(b.rank).padStart(2, "0")}-${b.slug}.md`
const pageOf = (b: LocationBrief) => {
  const p = PLANNED_PAGES.find((x) => x.path === b.path)
  if (!p) throw new Error(b.path)
  return p
}
const table = (head: string[], rows: string[][]) => [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`)].join("\n")

const HANDLING: Record<ClaimCategory, string> = {
  licensing: "Do not use until PSRA registration is evidenced and the 'licensed-compliant' claim is approved.",
  "superlative or quality": "Do not use. No ranking or 'best/top' statement without independent, citable evidence.",
  "availability or response time": "Do not use until the response model is evidenced and the availability and reply-time claims are approved.",
  pricing: "Do not use. No pricing content is approved.",
  "local presence or proximity": "Do not use as copy. It implies a verified local office and reachable service area; decide per owner decision L-D4.",
}

function p1Count(path: string) {
  return keywordsForPath(path).filter((k) => k.priority === "P1").length
}

export const OWNER_DECISIONS: { id: string; decision: string; why: string }[] = [
  { id: "L-D1", decision: "Which source is authoritative for office addresses, phone numbers and the company name: the website (lib/site-config.ts) or the legacy company-profile and brochure PDFs?", why: "They disagree on the Nakuru address, the second phone number and the company name, and the PDFs list Eldoret and Kisumu branches the site does not." },
  { id: "L-D2", decision: "The single public name for the Rongo / Migori County branch (the site says 'Migori', the page says 'Rongo').", why: "NAP must match on the website, Google Business Profile and signage. The page is /locations/rongo/ and there is no Migori page." },
  { id: "L-D3", decision: "Approve moving KW-093 (security company in nakuru town) to the Nakuru page and KW-094 (private security company in migori) to the Rongo page.", why: "The workbook maps both to the Nairobi page. Targeting them there would be a mismatch and cannibalise the real location pages." },
  { id: "L-D4", decision: "Where 'near me' keywords (KW-086, KW-087) go, if anywhere, until a verified Google Business Profile and service area exist.", why: "They are held as claim-sensitive, and a 'near me' query is not about one office." },
  { id: "L-D5", decision: "Whether KW-088 (hire security guards in nairobi) stays as a secondary keyword on the Nairobi page or moves to manned guarding.", why: "It overlaps the manned-guarding page's Nairobi keywords." },
  { id: "L-D6", decision: "Which of the seven services each office provides or arranges.", why: "Nothing in the repository says. The pages list only confirmed services." },
  { id: "L-D7", decision: "Who is the local manager for each office and will confirm hours, service area, showroom and signage evidence.", why: "The workbook assigns local pages to 'Copywriter + local manager'." },
  { id: "L-D8", decision: "Which office is head office: Nairobi (site, company profile) or Nakuru (a brochure caption says 'HQ - Nakuru').", why: "The page may use 'Head Office' only once resolved." },
  { id: "L-D9", decision: "Map treatment: link out, or embed a third-party map.", why: "An embed needs a privacy review and a deliberate change to the security headers." },
  { id: "L-D10", decision: "Approve the order (Nairobi and Nakuru first, Rongo after), the layout reuse, and any homepage change that links to the new pages.", why: "The design is frozen; the homepage offices block currently has no links." },
  { id: "L-D11", decision: "Confirm Eldoret and Kisumu are not current offices and need no pages.", why: "The workbook's LOCAL SEO sheet lists only Nairobi, Nakuru and Rongo / Migori." },
  { id: "L-D12", decision: "Approve the proposed unique-content gate (no more than 30 per cent of sentences shared with a sibling page).", why: "The threshold is a proposal for the SEO lead to confirm or change." },
]

function renderBrief(b: LocationBrief): string {
  const page = pageOf(b)
  const onPage = keywordsForPath(b.path)
  const primary = onPage.find((k) => k.keyword.toLowerCase() === page.primaryKeyword.toLowerCase())
  const rest = onPage.filter((k) => k !== primary)
  const held = rest.filter((k) => k.claimSensitive.length > 0)
  const usable = rest.filter((k) => k.claimSensitive.length === 0)
  const kwRows = (ks: typeof onPage) => ks.map((k) => [k.id, k.keyword, k.priority, k.intent, k.geography])
  const kwHead = ["ID", "Keyword", "Priority", "Intent", "Geography"]
  const nap = napFor(b)
  const sc = serviceCityKeywords(b)
  const out: string[] = []
  out.push(`# Location brief ${b.rank}: ${b.placeName}`, "", "Status: PLANNED, NOT PUBLISHED. No route, sitemap entry or link exists for this page.", "")
  out.push("## Summary", "", table(["Item", "Value"], [
    ["Proposed URL", `\`${canonical(b.path)}\` (workbook form \`${b.path}\`)`],
    ["Office on the site", `${b.officeName} (${siteConfig.offices.find((o) => o.name === b.officeName)?.label})`],
    ["Workbook page priority", page.priority],
    ["Priority rank / wave", `${b.rank} of 3, wave ${b.wave}`],
    ["Roadmap window", b.roadmapWindow],
    ["Primary keyword", page.primaryKeyword],
    ["Search intent", page.intent],
    ["Keywords mapped now", `${onPage.length} (${p1Count(b.path)} P1, ${held.length} held back)`],
    ["Workbook caution", page.workbookCaution],
  ]), "", `Intent note: ${b.intentNote}`, "")
  out.push("## Proposed metadata", "", table(["Field", "Proposal", "Length"], [
    ["Title", b.seoTitle, String(b.seoTitle.length)],
    ["Meta description", b.seoDescription, String(b.seoDescription.length)],
    ["H1", b.h1, String(b.h1.length)],
  ]), "", "The address is deliberately kept out of metadata until NAP is verified.", "")
  out.push("## Keywords", "", `Primary keyword: **${page.primaryKeyword}**${primary ? ` (${primary.id})` : ""}.`, "")
  out.push("### Supporting keywords usable in copy", "", usable.length ? table(kwHead, kwRows(usable)) : "None.", "")
  out.push("### Held back: claim-sensitive keywords", "", held.length ? table([...kwHead, "Category", "Handling"], held.map((k) => [...kwRows([k])[0], k.claimSensitive.join(", "), k.claimSensitive.map((c) => HANDLING[c]).join(" ")])) : "None.", "")
  const conflicts = b.keywordConflicts
  out.push("### Mapping conflicts on this page", "", conflicts.length ? table(["ID", "Keyword", "Mapped to", "Proposed", "Note"], conflicts.map((c) => [c.id, c.keyword, c.mappedTo, c.proposedPath ?? "no move proposed", c.note])) : "None.", "")
  const adds = proposedAdditionRows(b)
  out.push("### Proposed additions (owner decision L-D3)", "", adds.length ? table(kwHead.concat("Now mapped to"), adds.map((k) => [k.id, k.keyword, k.priority, k.intent, k.geography, k.plannedPath])) : "None.", "")
  out.push("### Service keywords for this place that stay on service pages", "", `${sc.length} workbook keywords name this place but are planned on service or industry pages (for example \`${sc[0].keyword}\` on \`${sc[0].plannedPath}\`). This page must not target them; it links to the service pages instead. One page per intent.`, "")
  out.push("## Page outline", "", table(["Section", "Purpose", "Unique to this office", "Needs"], b.outline.map((s) => [s.heading, s.purpose, s.unique ? "yes" : "no", s.condition ?? "-"])), "", "Sections whose condition is not met are not rendered.", "")
  out.push("## Existing approved information", "", "Only what the live site already shows (lib/site-config.ts). Approved for display, not verified.", "", table(["Field", "Value on the site", "Source", "Status", "Action"], nap.map((n) => [n.field, n.approvedValue ?? "(none held)", n.source, n.status, n.action])), "")
  out.push("## Operating hours", "", "No opening hours exist in the repository, the claims registry or the legacy PDFs. None may be written or marked up (evidence L3).", "")
  out.push("## Services requiring confirmation for this office", "", "The site lists seven services company-wide. Nothing records which are provided here (evidence L5).", "", table(["Service", "Status for this office"], SERVICES.map((s) => [s.name, "Unconfirmed"])), "")
  out.push("## Unique content requirements", "", table(["ID", "Requirement"], b.uniqueContent.map((u) => [u.id, u.requirement])), "", "Not allowed: swapping the town name into another office's text, listing neighbourhoods not served, or creating pages per suburb or per service and city.", "")
  out.push("## Missing evidence", "", "### Common to every location page", "", table(["ID", "Requirement", "Owner", "Blocks"], COMMON_EVIDENCE.map((e) => [e.id, e.requirement, e.owner, e.blocks])), "", "### Specific to this office", "", table(["ID", "Requirement", "Owner", "Blocks"], b.localEvidence.map((e) => [e.id, e.requirement, e.owner, e.blocks])), "")
  out.push("## Claims requiring approval", "", "Every registry claim is still needs-evidence. None may appear on this page until approved:", "", table(["Registry id", "Wording", "Status"], CLAIMS.map((c) => [c.id, c.text, c.status])), "")
  out.push("## Structured-data eligibility", "", "Eligible today: none. The page cannot carry LocalBusiness markup until the evidence below closes. Full rules: structured-data-requirements.md.", "", table(["Property", "Treatment", "Needs"], STRUCTURED_DATA_RULES.map((r) => [r.property, r.treatment, r.evidence.join(", ")])), "")
  out.push("## Suggested internal links", "", table(["Link to", "Anchor", "Status", "Note"], b.internalLinks.map((l) => [`\`${l.to}\``, l.anchor, l.status, l.note])), "")
  return out.join("\n")
}

function renderPlan(): string {
  const rows = LOCATION_BRIEFS.map((b) => {
    const page = pageOf(b)
    return [String(b.rank), `\`${b.path}\``, page.priority, b.roadmapWindow, String(keywordsForPath(b.path).length), String(p1Count(b.path)), String(keywordsForPath(b.path).filter((k) => k.claimSensitive.length > 0).length), `Wave ${b.wave}`]
  })
  const moved = LOCATION_BRIEFS.flatMap((x) => x.proposedAdditions)
  const afterMove = (b: LocationBrief) => {
    const ks = [...keywordsForPath(b.path).filter((k) => !moved.includes(k.id)), ...proposedAdditionRows(b)]
    return `${ks.length} (${ks.filter((k) => k.priority === "P1").length} P1)`
  }
  const nearbyKeywords = (slug: LocationBrief["slug"]) => WORKBOOK_KEYWORDS.filter((k) => LOCATION_WORDS[slug].test(k.keyword) && !k.plannedPath.startsWith("/locations/") && k.plannedPath !== "/").length
  return [
    "# Location-page priority plan", "",
    "Status: PREPARATION ONLY. No location page, route, sitemap entry or navigation link has been added. The live site is unchanged.", "",
    "## Sources", "",
    "Workbook sheets used: LOCAL SEO, PAGE MAP & META, KEYWORD MASTER, CLUSTER STRATEGY, 90 DAY ROADMAP, TECHNICAL AUDIT. The workbook holds no search volume, difficulty, CPC or ranking, so none is used.", "",
    "## Priority", "",
    "Order rule: workbook page priority (PAGE MAP & META), then roadmap window, then P1 keywords mapped to the page, then PAGE MAP row order.", "",
    table(["Rank", "Page", "Page priority", "Roadmap window", "Keywords", "P1", "Held", "Wave"], rows), "",
    "- Nairobi and Nakuru are P1 in both PAGE MAP and LOCAL SEO, and the roadmap schedules them together for Weeks 5-6 ('Publish differentiated Nairobi and Nakuru location pages', dependency: verified office information).",
    "- Rongo is P2 in PAGE MAP and LOCAL SEO ('Rongo / Migori' landing page) and has no roadmap window, so it follows. Its Google Business Profile and NAP audit is in Week 4 with the other two.",
    "- Week 4 ('Audit Nairobi, Nakuru and Rongo GBP ownership, NAP and categories') is a prerequisite for all three pages.", "",
    "## Findings", "",
    `1. **Nairobi carries most of the keywords.** ${keywordsForPath("/locations/nairobi/").length} mapped (${p1Count("/locations/nairobi/")} P1), Nakuru ${keywordsForPath("/locations/nakuru/").length} (${p1Count("/locations/nakuru/")} P1), Rongo ${keywordsForPath("/locations/rongo/").length} (${p1Count("/locations/rongo/")} P1). Nakuru's page therefore depends on unique local content rather than keyword volume.`,
    `2. **Two workbook mappings are wrong.** KW-093 'security company in nakuru town' and KW-094 'private security company in migori' are mapped to the Nairobi page. Proposed: Nakuru and Rongo (owner decision L-D3). With the move, Nairobi has ${afterMove(LOCATION_BRIEFS[0])}, Nakuru ${afterMove(LOCATION_BRIEFS[1])} and Rongo ${afterMove(LOCATION_BRIEFS[2])}. The generated keyword data is not edited in this milestone.`,
    "3. **'Near me' keywords (KW-086, KW-087) are on the Nairobi page** but are not about Nairobi and are held as claim-sensitive (L-D4).",
    `4. **Service-plus-city keywords stay on service pages**: ${nearbyKeywords("nairobi")} name Nairobi, ${nearbyKeywords("nakuru")} Nakuru and ${nearbyKeywords("rongo")} Rongo or Migori. Location pages must not duplicate them.`,
    "5. **Office data is thin and partly in conflict.** The site holds a name, a label and one address line per office, and two company-wide phone numbers. It holds no hours, postcode, coordinates, profile URL or per-office phone. The Nakuru address and the second phone number differ in the legacy company-profile PDF (see evidence-and-approvals.md).",
    "6. **Rongo and Migori are one page.** The site's office is named 'Migori' with the address 'Near KENGAS Rongo'; the page is /locations/rongo/ and there is no /locations/migori/.", "",
    "## What to do next, in order", "",
    "1. Owner answers the decisions in evidence-and-approvals.md (L-D1 to L-D12).",
    "2. Local managers supply NAP, hours, service area, services and signage evidence (nap-verification-checklist.md).",
    "3. Google Business Profile audit for all three offices (roadmap Week 4).",
    "4. Write wave 1 pages (Nairobi, Nakuru) from owner-supplied facts, then check against publishing-checklist.md.",
    "5. Wave 2 (Rongo) after wave 1, or earlier if the evidence is ready.", "",
    "Architecture for the pages: page-architecture.md. Structured data: structured-data-requirements.md.", "",
  ].join("\n")
}

function renderNap(): string {
  const out = ["# NAP verification checklist", "", "Name, address and phone must be identical on the website, Google Business Profile, directories and signage (LOCAL SEO: 'Verify exact office NAP'). One block per office. A field is verified only when the evidence column is filled and the local manager has signed it off. Today nothing is verified: LOCAL SEO status for every office is 'Not started'.", ""]
  for (const b of LOCATION_BRIEFS) {
    out.push(`## ${b.placeName} (${b.officeName} office on the site)`, "")
    out.push(table(["Field", "Value on the site", "Source", "Status", "Action", "Evidence reference", "Verified by / date"], napFor(b).map((n) => [n.field, n.approvedValue ?? "(none held)", n.source, n.status, n.action, "", ""])), "")
  }
  out.push("## Cross-office conflicts to resolve first", "", "- Nakuru address: site ('Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital') against company-profile PDF ('KFA Building, Along Geoffrey Kamau Avenue').", "- Second phone number: site 0705 038 679 against company-profile PDF +254 769 281 518.", "- Company name: public brand JOLU SECURITY; PDFs show 'JOLU GROUP SECURITY LIMITED' and 'JOLU GROUP LTD'.", "- Branches in Eldoret and Kisumu appear only in the company-profile PDF.", "- Head office: company profile says Nairobi; a brochure caption beside a K9 training photo names Nakuru as 'HQ'.", "", "## Sign-off", "", "A page may publish only when every row for its office is verified or consciously omitted, and the owner has recorded approval (L1).", "")
  return out.join("\n")
}

function renderStructured(): string {
  return [
    "# Structured-data requirements for location pages", "",
    "Status: REQUIREMENTS ONLY. No markup is added in this milestone. The homepage keeps its existing Organization and WebSite data, whose `location` list already carries each office's name and address.", "",
    "Google's documentation was not re-checked in this milestone (web access was unavailable). Re-verify the property lists and rich-result eligibility against Google's current documentation before implementing.", "",
    "## Principles", "",
    "- One LocalBusiness node per location page, for that office only.",
    "- Every value must also be visible on the page and come from lib/site-config.ts or an evidence-logged source.",
    "- Never mark up what is not verified: hours, coordinates, ratings, reviews, price range, licences and awards stay out until evidenced.",
    "- The node's name and address must equal the Organization.location entry on the homepage and the Google Business Profile.",
    "- Serialise with the existing serializeJsonLd.", "",
    "## Property rules", "",
    table(["Property", "Treatment", "Requirement", "Evidence"], STRUCTURED_DATA_RULES.map((r) => [r.property, r.treatment, r.requirement, r.evidence.join(", ")])), "",
    "## Eligibility today", "",
    table(["Page", "LocalBusiness eligible now", "Blocked by"], LOCATION_BRIEFS.map((b) => [`\`${b.path}\``, "No", ["L1", "L2", "L7", ...b.localEvidence.filter((e) => e.blocks === "publication").map((e) => e.id)].join(", ")])), "",
    "## Graph shape when eligible", "",
    "`@graph` containing one LocalBusiness whose `parentOrganization` is `{ \"@id\": \"https://www.jolusecurity.com/#organization\" }`. No FAQPage, BreadcrumbList, Review or AggregateRating until their conditions in the table are met.", "",
    "## Validation", "",
    "Rich Results Test and a schema validator on each page, with the output attached to the publishing checklist (TECHNICAL AUDIT: 'No invalid or misleading markup').", "",
  ].join("\n")
}

function renderChecklist(): string {
  return [
    "# Location-page publishing acceptance checklist", "",
    "Every box must be ticked, with proof recorded, before a location page is added to `LIVE_PAGES`. Use one copy per page.", "",
    table(["Done", "Area", "Check", "Source", "Proof"], LOCATION_CHECKLIST.map((c) => ["[ ]", c.area, c.check, c.source, c.proof])), "",
  ].join("\n")
}

function renderEvidence(): string {
  const gaps = LOCATION_BRIEFS.flatMap((b) => b.localEvidence.map((e) => [b.placeName, e.id, e.requirement, e.owner, e.blocks]))
  return [
    "# Evidence and approvals needed before publication", "",
    "## Common evidence (every location page)", "",
    table(["ID", "Requirement", "Owner", "Blocks"], COMMON_EVIDENCE.map((e) => [e.id, e.requirement, e.owner, e.blocks])), "",
    "## Office-specific evidence", "",
    table(["Page", "ID", "Requirement", "Owner", "Blocks"], gaps), "",
    "## Discrepancies between the website and the legacy PDFs", "",
    "The PDFs are linked from the live site (`/lovable-uploads/company-profile.pdf`, `/lovable-uploads/brochure.pdf`).", "",
    table(["Item", "Website (lib/site-config.ts)", "Legacy PDF"], [
      ["Nakuru address", "Along West Road, Opposite Nakuru Athletics, Next to Evans Hospital, Nakuru, Kenya", "Company profile: KFA Building, Along Geoffrey Kamau Avenue"],
      ["Second phone number", "0705 038 679", "Company profile: +254 769 281 518"],
      ["Other branches", "Nairobi, Nakuru, Migori only", "Company profile: Eldoret, Migori and Kisumu"],
      ["Company name", "JOLU SECURITY", "Company profile: JOLU GROUP SECURITY LIMITED (header), JOLU GROUP LTD SECURITY (cover)"],
      ["Head office", "Nairobi: Head Office", "Company profile: Nairobi, Thome Estate. A brochure caption beside K9 training photos names Nakuru as 'HQ' (verify on the page itself)"],
    ]), "",
    "## Owner decisions", "",
    table(["ID", "Decision", "Why it matters"], OWNER_DECISIONS.map((d) => [d.id, d.decision, d.why])), "",
  ].join("\n")
}

export function renderLocationDocs(): Record<string, string> {
  const files: Record<string, string> = {
    "priority-plan.md": renderPlan(),
    "nap-verification-checklist.md": renderNap(),
    "structured-data-requirements.md": renderStructured(),
    "publishing-checklist.md": renderChecklist(),
    "evidence-and-approvals.md": renderEvidence(),
  }
  for (const b of LOCATION_BRIEFS) files[briefFileName(b)] = renderBrief(b)
  return files
}
