// Synthetic "fully approved" worlds and the table of cases the publication gate must accept or reject.
// Shared by the behaviour tests and the automated mutation tests, so both exercise the same production code paths.
// NOTHING here is imported by application code; no real page is approved.
const { SERVICE_PAGE_RECORDS, LOCATION_PAGE_RECORDS, ALL_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { REQUIRED_EVIDENCE, LOCATION_IDENTITY, expectedScope, primaryEvidence } = await import("@/lib/seo/publication-requirements")
const { contentDigest } = await import("@/lib/seo/publication-gate")
const { CLAIMS } = await import("@/lib/claims")
const { SERVICES } = await import("@/lib/services")
const { siteConfig } = await import("@/lib/site-config")

export const AS_OF = "2026-11-19"
export const clone = (x) => JSON.parse(JSON.stringify(x))
export const SERVICE = SERVICE_PAGE_RECORDS[0]
export const NAIROBI = LOCATION_PAGE_RECORDS[0]
export const NAKURU = LOCATION_PAGE_RECORDS[1]
export const RONGO = LOCATION_PAGE_RECORDS[2]

const P1 = "Guards are placed at the entrances and gates that the client chooses for the site, and each post reports to a named supervisor."
const P2 = "A written scope sheet lists the posts, the shift pattern and the exclusions agreed with the operations team before any guard starts work."
export const CLAIM_PARA = "Client sites are supported by a control room that is available 24/7 and logs each call against the named site contact."
export const CLAIM_STATEMENT = "available 24/7"

const entry = (id, over = {}) => ({ id, status: "VERIFIED", verifiedBy: "Test Verifier, Compliance", verifiedOn: "2026-11-18", document: "independent-test-document", expiresOn: null, revokedOn: null, supersededBy: null, replaces: null, attested: null, scope: expectedScope(id) ?? "company", ...over })
export { entry }

/** Recomputes the review digests after a case edited content, so a case fails only for the reason it targets. */
let digestFn = contentDigest
/** The digest function used to simulate a reviewer: the module under test's own, so digest mutants are judged on rejections. */
export const setDigestFn = (f) => { digestFn = typeof f === "function" ? f : contentDigest }
export function redigest(w) {
  try {
    const d = digestFn(w.record, w.deps.manifest?.[0] ?? null)
    for (const k of ["editorialReview", "complianceReview"]) { const rv = w.record.approval?.[k]; if (rv && typeof rv === "object" && /^[0-9a-f]{64}$/.test(rv.contentDigest ?? "")) rv.contentDigest = d }
  } catch { /* leave as is */ }
  return w
}

/** A world in which `base` is fully approved. `opts` extends it (claims, licence evidence, NAP overrides). */
export function world(base = SERVICE, opts = {}) {
  const r = clone(base)
  const canonical = [...REQUIRED_EVIDENCE[r.publicPath]]
  const sectionEvidence = opts.sectionEvidence ?? [primaryEvidence(r.publicPath)]
  r.status = "approved"
  r.sections = opts.sections ?? [{ id: "scope", heading: "Scope of the service", body: [P1, P2], evidenceIds: sectionEvidence, claims: [] }]
  const attested = { "COM-05": { primaryPhone: siteConfig.contact.primaryPhone.e164 } }
  if (r.kind === "location") {
    const ident = LOCATION_IDENTITY[r.slug]
    r.nap = { displayName: "Test Office", branchDesignation: "Regional Office", streetAddress: "1 Test Road", locality: "Testville", telephone: "+254700000001", ...(opts.nap ?? {}) }
    attested[ident.nameEvidence] = { displayName: r.nap.displayName, branchDesignation: r.nap.branchDesignation }
    attested[ident.addressEvidence] = { streetAddress: r.nap.streetAddress, locality: r.nap.locality }
    attested[ident.phoneEvidence] = { telephone: r.nap.telephone }
    attested["COM-03"] = { headOffice: opts.headOfficeFor ?? r.officeName }
    if (opts.coverage) r.verifiedCoverage = clone(opts.coverage)
  }
  const ids = new Set([...canonical, ...sectionEvidence, ...(r.verifiedCoverage?.evidenceIds ?? []), ...(opts.extraEvidence ?? []), ...(opts.nap && /head office/i.test(opts.nap.branchDesignation ?? "") ? ["COM-03"] : []), ...(opts.nap && /showroom/i.test(opts.nap.branchDesignation ?? "") ? ["OFF-NAK-11"] : [])])
  const ledger = [...ids].map((id) => entry(id, { attested: attested[id] ?? null, ...(opts.entryOver?.[id] ?? {}) }))
  const approvedIds = opts.approvedClaims ?? []
  const claims = [...CLAIMS.filter((c) => !approvedIds.includes(c.id)), ...approvedIds.map((id) => ({ id, text: "Synthetic", status: "approved", evidence: "test-evidence" }))]
  r.approval = {
    authorization: "owner",
    approvedBy: "Test Owner, CEO",
    approvedOn: "2026-11-19",
    path: r.publicPath,
    reference: "TEST-REF-1",
    layoutApproved: true,
    evidenceIds: [...ids],
    editorialReview: { reviewedBy: "Test Editor", reviewedOn: "2026-11-18", reference: "TEST-ED-1", contentDigest: "0".repeat(64) },
    complianceReview: opts.compliance ? { reviewedBy: "Test Compliance", reviewedOn: "2026-11-18", reference: "TEST-CO-1", contentDigest: "0".repeat(64) } : null,
    claimApprovals: opts.claimApprovals ?? [],
  }
  const manifest = [{ publicPath: r.publicPath, routeFile: `app/${r.publicPath.slice(1)}/page.tsx`, title: "Test page", description: "A neutral test description of the page." }]
  return redigest({ record: r, deps: { ledger, claims, manifest, asOf: AS_OF } })
}

/** A world whose single section makes the claim "availability-24-7", fully and explicitly approved. */
export function claimWorld(base = SERVICE) {
  return world(base, {
    sections: [{ id: "support", heading: "Support", body: [CLAIM_PARA, P2], evidenceIds: [primaryEvidence(base.publicPath)], claims: [{ claimId: "availability-24-7", statement: CLAIM_STATEMENT }] }],
    approvedClaims: ["availability-24-7"],
    compliance: true,
    claimApprovals: [{ claimId: "availability-24-7", sectionId: "support", statement: CLAIM_STATEMENT, editorialApprovedBy: "Test Editor", complianceApprovedBy: "Test Compliance" }],
  })
}

const setEntry = (w, id, over) => Object.assign(w.deps.ledger.find((e) => e.id === id), over)
const firstLedger = (w) => w.deps.ledger[0]
const sec = (w) => w.record.sections[0]
const withSecText = (text) => () => {
  const w = world()
  sec(w).body = [text, P2]
  return w
}
const loc = (over, o = {}) => () => {
  const w = world(NAIROBI, o)
  over(w)
  return w
}
const claimed = (fn) => () => {
  const w = claimWorld()
  fn(w)
  return w
}
const licence = (over) => () => {
  const w = world(SERVICE, { extraEvidence: ["CMP-01"], sectionEvidence: [primaryEvidence(SERVICE.publicPath), "CMP-01"], entryOver: { "CMP-01": { expiresOn: "2027-06-30", ...over } } })
  return w
}
/** 5D.10 chain helpers: replace `id` by hops [id, overrides], each hop inheriting the previous entry's scope. */
const hop = (w, id, hops) => {
  let prev = id
  for (const [rid, over = {}] of hops) {
    const old = w.deps.ledger.find((e) => e.id === prev)
    old.supersededBy = rid
    w.deps.ledger.push(entry(rid, { replaces: prev, scope: old.scope, expiresOn: old.expiresOn, ...over }))
    w.record.approval.evidenceIds.push(rid)
    prev = rid
  }
  return w
}
const longChain = (n, tailId, tailOver = {}) => {
  const w = world(SERVICE)
  const hops = Array.from({ length: n }, (_, i) => (i === n - 1 && tailId ? [tailId, { expiresOn: null, ...tailOver }] : [`ZZZ-${String(i).padStart(2, "0")}`, {}]))
  return hop(w, "CMP-05", hops)
}
const svc = (fn) => () => {
  const w = world()
  fn(w)
  return w
}

/** R04B-01: page text that uses plain commercial words and asserts no price. Each must publish in a synthetic world. */
export const PRICING_ALLOWED = [
  "The price of manned guarding depends on the number of posts, the hours covered and the supervision a site needs.",
  "Request a quotation through the enquiry form, and a written proposal follows the site assessment agreed with you.",
  "Compare what each quotation includes before comparing totals, because a lower figure can reflect a smaller scope of work.",
  "This guide explains the cost drivers for CCTV installation so that buyers can plan a realistic budget for their site.",
  "Ask every provider which fees and charges are included in the written proposal before you sign any contract at all.",
  "Should I choose a guard arrangement on price alone, or compare the scope that each provider proposes for the site?",
  "Budget factors for K9 unit services differ between sites because each dog and handler team adds to the arrangement.",
  "The budget for manned guarding typically depends on the number of security posts, required coverage hours and site requirements.",
  "The arrangement should fit the risks you face rather than a standard package, and it should be reviewed when things change.",
  "A K9 team can add value at large or open sites, and a site assessment should check whether it suits the property.",
  "Agree in writing how extra cover would be charged, so that you are not negotiating about it on the day of the event.",
  "The guard is free to call the supervisor at any time during the shift, and every call is written in the post log.",
  "Keep the fence line free from vegetation, because plants touching the wires can trigger false alarms on the energiser.",
]
/** R04B-01: pricing claims. Each must be refused for claim-sensitive (pricing) wording. [name, text] */
export const PRICING_BLOCKED = [
  ["KES amount", "Guarding rates start from KES 25,000 per guard each month for a standard residential post in the estate."],
  ["shillings amount", "Our CCTV packages are 45,000 shillings including installation and a basic recorder for small shops and offices."],
  ["amount per unit", "Alarm response is available at 3,500 a month for residential properties within the agreed service area here."],
  ["currency glued to a figure", "Clients pay Ksh5000 for each camera in a standard indoor installation including cabling within the building."],
  ["price word then figure", "The monthly fee for one post is 30,000 on the standard contract for residential estates and small offices."],
  ["figure then price word", "A single post comes to 2,000 in fees for each shift, with the supervisor visit included in that arrangement."],
  ["lowest prices", "We offer the lowest prices for manned guarding of any provider in the area for homes and offices alike today."],
  ["fixed price", "Every client receives a fixed price for the whole contract period with no surprises at the annual review meeting."],
  ["rate card", "Ask for our rate card to compare guarding options for residential, commercial and construction sites in the region."],
  ["no hidden fees and discount", "Electric fencing is installed with no hidden fees and a discount for estates that sign up together this season."],
  ["free site assessment", "Request your free site assessment today and a member of the team will arrange a convenient visit to the property."],
  ["prices start", "Our prices start low for every guarding contract signed with the operations team before the end of the month."],
  ["competitive rates", "We provide competitive rates for alarm response across the estates and business parks that the team already serves."],
  // R04B-02: one case per rule that no other rule catches, so each rule is proven load-bearing by the mutation harness
  ["currency word only", "All guarding contracts are invoiced in Kenyan shillings at the end of every calendar month for each site."],
  ["price word near a plain figure", "The fee for a single post is 300 on the standard contract for residential estates and small offices."],
  // R04B-03: cases from the delta review of 9c39102
  ["at no extra cost", "Weekend patrol visits are provided at no extra cost to residents of the estate during the first contract month."],
  ["free of charge", "Alarm testing is done free of charge for residents of the estate during the first month of every contract."],
  ["spelled-out amount", "Guard services cost twenty five thousand a month for homes, offices and estates across the region we serve."],
  ["half of what others ask", "Guards cost half of what others ask for homes, offices and estates across the region we serve."],
  ["price of one", "Two guards for the price of one for homes, offices and estates across the region we serve."],
  ["kept to a minimum", "Our charges are kept to a minimum for homes, offices and estates across the region we serve."],
  ["pay less", "You will pay less with us than with the big firms for homes, offices and estates across the region we serve."],
  ["free monitoring", "Enjoy one month of free monitoring for homes, offices and estates across the region we serve."],
  ["on the house", "First assessment is on the house for homes, offices and estates across the region we serve."],
  ["bundle deals", "Save money with our bundle deals for homes, offices and estates across the region we serve."],
  // R04B-02: cases from the independent review of 00212ee (refused at 9907837, published at 00212ee, or missed by both)
  ["rates are the lowest", "Our rates are the lowest in Nakuru for homes, offices and estates across the region we serve."],
  ["prices lower than", "Our prices are lower than other firms for homes, offices and estates across the region we serve."],
  ["costs less than", "Our CCTV kits cost less than any other provider for homes, offices and estates across the region we serve."],
  ["price is negotiable", "Price is negotiable after the site visit for homes, offices and estates across the region we serve."],
  ["rates are negotiable", "Rates are negotiable for long-term clients for homes, offices and estates across the region we serve."],
  ["most reasonable fees", "Our fees are among the most reasonable for homes, offices and estates across the region we serve."],
  ["pocket friendly", "Our pricing is pocket friendly and flexible for homes, offices and estates across the region we serve."],
  ["pricing is transparent", "Pricing is transparent and simple for homes, offices and estates across the region we serve."],
  ["rates are fair", "Our rates are fair and honest for homes, offices and estates across the region we serve."],
  ["quotes are free", "Quotes are free and come within one day for homes, offices and estates across the region we serve."],
  ["Sh amount", "Each guard is Sh 20,000 monthly for homes, offices and estates across the region we serve."],
  ["slash-equals amount", "A post comes to 20000/= monthly for homes, offices and estates across the region we serve."],
  ["k amount", "Guarding from 15k monthly for homes, offices and estates across the region we serve."],
  ["bob", "Patrols at 25 bob an hour for homes, offices and estates across the region we serve."],
  ["bare amount", "Alarm response is just 2,500 for homes, offices and estates across the region we serve."],
  ["amount each", "Cameras go for 8000 each for homes, offices and estates across the region we serve."],
  ["amount range", "Installation typically runs 60,000 to 90,000 installed for homes, offices and estates across the region we serve."],
  ["percentage saving", "Save 20% on the monthly invoice for homes, offices and estates across the region we serve."],
  ["percent off", "Get 10 percent off the first contract for homes, offices and estates across the region we serve."],
  ["survey is free", "The site survey is free for homes, offices and estates across the region we serve."],
  ["do not charge", "We do not charge for the initial site assessment for homes, offices and estates across the region we serve."],
  ["complimentary", "Installation is complimentary for homes, offices and estates across the region we serve."],
  ["pay nothing", "Pay nothing for the first month for homes, offices and estates across the region we serve."],
  ["unbeatable value", "Unbeatable value on guarding contracts for homes, offices and estates across the region we serve."],
  ["tiered packages", "Choose Basic, Standard and Premium security packages for homes, offices and estates across the region we serve."],
]

/** Worlds that MUST publish. [name, builder] */
export const GOOD = [
  ["service", () => world()],
  ["every planned service", null],
  ["location with verified NAP", () => world(NAIROBI)],
  ["rongo location", () => world(RONGO)],
  ["claim bound to an exact statement with editorial and compliance approval", () => claimWorld()],
  ["licence evidence with a future expiry", licence({})],
  ["head-office designation with COM-03", () => world(NAIROBI, { nap: { branchDesignation: "Head Office" } })],
  ["a record whose accessors change after the first read is judged on one snapshot", () => {
    const w = world(); const real = w.record; const reads = {}
    const flaky = {}
    for (const k of Object.keys(real)) Object.defineProperty(flaky, k, { enumerable: true, get() { reads[k] = (reads[k] ?? 0) + 1; return reads[k] === 1 ? real[k] : "tampered" } })
    return { record: flaky, deps: w.deps }
  }],
  ["superseded evidence replaced by a valid entry", svc((w) => {
    const id = w.deps.ledger[3].id
    w.deps.ledger[3] = { ...w.deps.ledger[3], supersededBy: `${id}-R2` }
    w.deps.ledger.push({ ...w.deps.ledger[3], id: `${id}-R2`, supersededBy: null, replaces: id })
    w.record.approval.evidenceIds.push(`${id}-R2`)
  })],
  ["location with verified coverage", () => world(NAKURU, { coverage: { serviceIds: ["manned-guarding"], areas: ["Test Estate"], evidenceIds: ["OFF-NAK-06", "OFF-NAK-10"] } })],
  // R04B-01 claims policy: ordinary commercial vocabulary is not a pricing claim on a page
  ...PRICING_ALLOWED.map((t, i) => [`R04B-01 commercial vocabulary is accepted (${i + 1})`, () => redigest(withSecText(t)())]),
].filter(([, b]) => b)

/** Worlds that MUST NOT publish. [name, builder] */
export const BAD = [
  // F-02 canonical requirements
  ["record declaring weaker requirements still needs the canonical table", svc((w) => { w.record.requiredEvidence = ["COM-05"]; w.deps.ledger = w.deps.ledger.filter((e) => e.id === "COM-05") })],
  ...REQUIRED_EVIDENCE[SERVICE.publicPath].map((id) => [`canonical evidence ${id} missing from the ledger`, svc((w) => { w.deps.ledger = w.deps.ledger.filter((e) => e.id !== id) })]),
  ...REQUIRED_EVIDENCE[SERVICE.publicPath].map((id) => [`approval omits canonical evidence ${id}`, svc((w) => { w.record.approval.evidenceIds = w.record.approval.evidenceIds.filter((x) => x !== id) })]),
  ...REQUIRED_EVIDENCE[NAIROBI.publicPath].map((id) => [`location canonical evidence ${id} missing`, loc((w) => { w.deps.ledger = w.deps.ledger.filter((e) => e.id !== id) })]),
  // F-03 identity
  ["bogus serviceId", svc((w) => (w.record.serviceId = "bogus"))],
  ["serviceId of another service", svc((w) => (w.record.serviceId = "vip-close-protection"))],
  ["locationId of another location", loc((w) => (w.record.locationId = "nakuru"))],
  ["office identity of another office", loc((w) => (w.record.officeName = "Nakuru"))],
  ["office identity unknown", loc((w) => (w.record.officeName = "Eldoret"))],
  ["slug differs from path", svc((w) => (w.record.slug = "cctv-installation"))],
  ["plannedPath of another page", svc((w) => (w.record.plannedPath = "/services/cctv-installation/"))],
  ["kind differs from path", svc((w) => (w.record.kind = "location"))],
  ["migori slug", loc((w) => { w.record.slug = "migori"; w.record.locationId = "migori"; w.record.publicPath = "/locations/migori"; w.record.plannedPath = "/locations/migori/"; w.record.approval.path = "/locations/migori"; w.deps.manifest[0].publicPath = "/locations/migori"; w.deps.manifest[0].routeFile = "app/locations/migori/page.tsx" })],
  ["path traversal", svc((w) => { w.record.publicPath = "/services/../api"; w.record.approval.path = w.record.publicPath })],
  ["trailing-slash path", svc((w) => { w.record.publicPath += "/"; w.record.approval.path = w.record.publicPath })],
  ["uppercase path", svc((w) => { w.record.publicPath = "/services/Manned-Guarding"; w.record.approval.path = w.record.publicPath })],
  // F-04 NAP
  ["location without NAP", loc((w) => (w.record.nap = null))],
  ["NAP name differs from attested", loc((w) => (w.record.nap.displayName = "Other Office"))],
  ["NAP designation differs from attested", loc((w) => (w.record.nap.branchDesignation = "Branch"))],
  ["NAP address differs from attested", loc((w) => (w.record.nap.streetAddress = "9 Other Road"))],
  ["NAP locality differs from attested", loc((w) => (w.record.nap.locality = "Elsewhere"))],
  ["NAP telephone differs from attested", loc((w) => (w.record.nap.telephone = "+254700000002"))],
  ["NAP telephone not E.164", loc((w) => { w.record.nap.telephone = "0700000001"; setEntry(w, "OFF-NBO-05", { attested: { telephone: "0700000001" } }) })],
  ["NAP evidence has no attested values", loc((w) => setEntry(w, "OFF-NBO-02", { attested: null }))],
  ["NAP field empty", loc((w) => { w.record.nap.locality = ""; setEntry(w, "OFF-NBO-02", { attested: { streetAddress: "1 Test Road", locality: "" } }) })],
  ["head-office designation without COM-03", loc((w) => { w.record.nap.branchDesignation = "Head Office"; setEntry(w, "OFF-NBO-01", { attested: { displayName: "Test Office", branchDesignation: "Head Office" } }) })],
  ["showroom designation without OFF-NAK-11", () => { const w = world(NAKURU); w.record.nap.branchDesignation = "Regional Office & Showroom"; setEntry(w, "OFF-NAK-01", { attested: { displayName: "Test Office", branchDesignation: "Regional Office & Showroom" } }); return w }],
  ["primary phone not attested by COM-05", svc((w) => setEntry(w, "COM-05", { attested: { primaryPhone: "+254700000099" } }))],
  ["COM-05 attests nothing", svc((w) => setEntry(w, "COM-05", { attested: null }))],
  ["coverage services not tied to evidence", loc((w) => (w.record.verifiedCoverage = { serviceIds: ["manned-guarding"], areas: [], evidenceIds: [] }))],
  ["coverage lists an unknown service", loc((w) => (w.record.verifiedCoverage = { serviceIds: ["bogus"], areas: [], evidenceIds: ["OFF-NBO-06"] }))],
  ["coverage areas not tied to evidence", loc((w) => (w.record.verifiedCoverage = { serviceIds: [], areas: ["Test Estate"], evidenceIds: [] }))],
  // F-05 lifecycle
  ["expired evidence", svc((w) => setEntry(w, "COM-05", { expiresOn: "2026-11-18" }))],
  ["evidence expiring on the approval date", svc((w) => setEntry(w, "COM-05", { expiresOn: "2026-11-19" }))],
  ["invalid expiry date", svc((w) => setEntry(w, "COM-05", { expiresOn: "2027-02-30" }))],
  ["revoked evidence", svc((w) => setEntry(w, "COM-05", { revokedOn: "2026-11-18" }))],
  ["superseded evidence with no replacement", svc((w) => setEntry(w, "COM-05", { supersededBy: "COM-05-R2" }))],
  ["superseded evidence whose replacement does not point back", svc((w) => { setEntry(w, "CMP-05", { supersededBy: "CMP-05-R2" }); w.deps.ledger.push(entry("CMP-05-R2")) })],
  ["replacement of an entry that does not name it", svc((w) => w.deps.ledger.push(entry("CMP-05-R2", { replaces: "CMP-05" })))],
  ["superseded evidence whose replacement is revoked", svc((w) => { setEntry(w, "CMP-05", { supersededBy: "CMP-05-R2" }); w.deps.ledger.push(entry("CMP-05-R2", { replaces: "CMP-05", revokedOn: "2026-11-18" })) })],
  ["duplicate evidence id", svc((w) => w.deps.ledger.push({ ...firstLedger(w), status: "CONFLICTED" }))],
  ["duplicate evidence id (identical)", svc((w) => w.deps.ledger.push({ ...firstLedger(w) }))],
  ["PROVISIONAL evidence", svc((w) => setEntry(w, "COM-05", { status: "PROVISIONAL" }))],
  ["CONFLICTED evidence", svc((w) => setEntry(w, "COM-05", { status: "CONFLICTED" }))],
  ["invalid status", svc((w) => setEntry(w, "COM-05", { status: "OK" }))],
  ["no verifier", svc((w) => setEntry(w, "COM-05", { verifiedBy: " " }))],
  ["no document", svc((w) => setEntry(w, "COM-05", { document: "" }))],
  ["verification date not a real date", svc((w) => setEntry(w, "COM-05", { verifiedOn: "2026-02-30" }))],
  ["verification dated after the decision date", svc((w) => setEntry(w, "COM-05", { verifiedOn: "2026-11-20" }))],
  ["verification dated after the approval", svc((w) => { w.record.approval.approvedOn = "2026-11-17"; w.record.approval.editorialReview.reviewedOn = "2026-11-16" })],
  ["evidence expired between approval and the decision date", svc((w) => { w.record.approval.approvedOn = "2026-11-17"; w.record.approval.editorialReview.reviewedOn = "2026-11-16"; for (const e of w.deps.ledger) e.verifiedOn = "2026-11-16"; setEntry(w, "COM-05", { expiresOn: "2026-11-18" }) })],
  ["inconsistent supersession pair on an unneeded entry", svc((w) => { w.deps.ledger.push(entry("ZZZ-01", { supersededBy: "ZZZ-02" }), entry("ZZZ-02")) })],
  ["malformed attested values on a needed entry", svc((w) => setEntry(w, "CMP-05", { attested: { anything: 5 } }))],
  ["malformed claims on a neutral section", svc((w) => (sec(w).claims = [{ claimId: "" }]))],
  ["claim statement absent from neutral text", svc((w) => { sec(w).claims = [{ claimId: "availability-24-7", statement: "open all night" }]; w.deps.claims = w.deps.claims.map((c) => (c.id === "availability-24-7" ? { ...c, status: "approved", evidence: "e" } : c)); w.record.approval.complianceReview = { reviewedBy: "C", reviewedOn: "2026-11-18", reference: "R" }; w.record.approval.claimApprovals = [{ claimId: "availability-24-7", sectionId: "scope", statement: "open all night", editorialApprovedBy: "E", complianceApprovedBy: "C" }] })],
  ["a bound claim does not cover other claim-sensitive wording in the same paragraph", claimed((w) => { sec(w).body = [CLAIM_PARA + " Our licensed guards are also on every post, and each one reports to the named supervisor.", P2] })],
  ["two sections: approval for one does not cover the other", claimed((w) => { w.record.sections.push({ id: "support-2", heading: "More support", body: ["Escalation calls are answered by the control room that is available 24/7 and logged against the same named site contact."], evidenceIds: sec(w).evidenceIds, claims: [{ claimId: "availability-24-7", statement: CLAIM_STATEMENT }] }) })],
  ["malformed attested values", svc((w) => setEntry(w, "COM-05", { attested: { primaryPhone: 5 } }))],
  ...["status", "verifiedBy", "verifiedOn", "document", "expiresOn", "revokedOn", "supersededBy", "replaces", "attested", "scope"].map((k) => [`ledger entry missing key ${k}`, svc((w) => delete w.deps.ledger.find((e) => e.id === "COM-05")[k])]),
  ["ledger entry without id", svc((w) => w.deps.ledger.push({ status: "VERIFIED" }))],
  ["ledger entry null", svc((w) => w.deps.ledger.push(null))],
  ["licence evidence without an expiry", licence({ expiresOn: null })],
  ["expired licence evidence", licence({ expiresOn: "2026-11-01" })],
  ["revoked licence evidence", licence({ revokedOn: "2026-11-10" })],
  // F-06 claims
  ["claim-sensitive wording with no claim", withSecText("The control room is available 24/7 and logs each call against the named site contact.")],
  ["claim bound to a different statement than the wording", claimed((w) => (sec(w).claims[0].statement = "named site contact"))],
  ["unrelated approved claim does not unlock other claim-sensitive text", claimed((w) => { sec(w).body = [CLAIM_PARA, "Our guards are professional and the best in the region, and each post reports to a named supervisor."] })],
  ["claim statement not in the text", claimed((w) => { sec(w).claims[0].statement = "open all night"; w.record.approval.claimApprovals[0].statement = "open all night" })],
  ["claim not approved in the registry", claimed((w) => (w.deps.claims = w.deps.claims.map((c) => (c.id === "availability-24-7" ? { ...c, status: "needs-evidence" } : c))))],
  ["claim approved without evidence", claimed((w) => (w.deps.claims = w.deps.claims.map((c) => (c.id === "availability-24-7" ? { ...c, evidence: null } : c))))],
  ["claim unknown in the registry", claimed((w) => (w.deps.claims = w.deps.claims.filter((c) => c.id !== "availability-24-7")))],
  ["claim without an approval entry", claimed((w) => (w.record.approval.claimApprovals = []))],
  ["claim approval for another section", claimed((w) => (w.record.approval.claimApprovals[0].sectionId = "other"))],
  ["claim approval without editorial approver", claimed((w) => (w.record.approval.claimApprovals[0].editorialApprovedBy = ""))],
  ["claim approval without compliance approver", claimed((w) => (w.record.approval.claimApprovals[0].complianceApprovedBy = ""))],
  ["stray claim approval", claimed((w) => w.record.approval.claimApprovals.push({ claimId: "trained-personnel", sectionId: "support", statement: "x", editorialApprovedBy: "E", complianceApprovedBy: "C" }))],
  ["claims present but no compliance review", claimed((w) => (w.record.approval.complianceReview = null))],
  ["malformed section claims", claimed((w) => (sec(w).claims = [{ claimId: "" }]))],
  ["no editorial review", svc((w) => (w.record.approval.editorialReview = null))],
  ["editorial review incomplete", svc((w) => (w.record.approval.editorialReview.reviewedBy = ""))],
  ["editorial review dated after approval", svc((w) => (w.record.approval.editorialReview.reviewedOn = "2026-11-20"))],
  ["editorial review not a real date", svc((w) => (w.record.approval.editorialReview.reviewedOn = "2026-13-01"))],
  ["compliance review dated after approval", claimed((w) => (w.record.approval.complianceReview.reviewedOn = "2026-11-20"))],
  ...[["24x7", "Open 24x7 for every client site, with each post reporting to a named supervisor."], ["twenty-four", "Support is on duty twenty-four hours a day, with each post reporting to a named supervisor."], ["award", "Our award-winning guards stand at the entrances the client chooses, reporting to a named supervisor."], ["nationwide", "Nationwide coverage is arranged for each client, with every post reporting to a named supervisor."], ["number one", "We are the number one choice for guards at the entrances a client chooses, each reporting to a supervisor."], ["no.1", "No.1 guards stand at the entrances the client chooses, each post reporting to a named supervisor."], ["leader", "As a market leader we place guards at the entrances the client chooses, each reporting to a named supervisor."], ["approved", "Government approved guards stand at the entrances the client chooses, each reporting to a named supervisor."], ["clients count", "Serving over 500 clients, guards stand at the entrances the client chooses, each reporting to a supervisor."], ["since year", "Operating since 2005, guards stand at the entrances the client chooses, each reporting to a named supervisor."], ["guarantee", "Each post is guaranteed to report to a named supervisor at the entrances that the client chooses."], ["licensed", "Our licensed guards stand at the entrances the client chooses, each reporting to a named supervisor."], ["professional", "Our professional guards stand at the entrances the client chooses, each reporting to a named supervisor."]].map(([n, t]) => [`scan evasion: ${n}`, withSecText(t)]),
  ["claim-sensitive section heading", svc((w) => (sec(w).heading = "The best guards"))],
  ["claim-sensitive NAP name", () => { const w = world(NAIROBI, { nap: { displayName: "Best Office" } }); return w }],
  ["claim-sensitive NAP designation", () => { const w = world(NAIROBI, { nap: { branchDesignation: "Licensed Branch" } }); return w }],
  ["claim-sensitive NAP address", () => { const w = world(NAIROBI, { nap: { streetAddress: "1 Quick Road" } }); return w }],
  ["claim-sensitive area text", () => world(NAIROBI, { coverage: { serviceIds: [], areas: ["24/7 coverage"], evidenceIds: ["OFF-NBO-10"] } })],
  ["claim-sensitive manifest title", svc((w) => (w.deps.manifest[0].title = "Best guards"))],
  ["claim-sensitive manifest description", svc((w) => (w.deps.manifest[0].description = "Licensed and available 24/7."))],
  // F-07 content
  ["no sections", svc((w) => (w.record.sections = []))],
  ["sections not an array", svc((w) => (w.record.sections = "x"))],
  ["paragraph under the word floor", withSecText("Guards at gates.")],
  ["duplicate paragraph on the page", svc((w) => (sec(w).body = [P1, P1]))],
  ["copy of the approved service description", svc((w) => (sec(w).body = [SERVICES[0].description, P2]))],
  ["section without evidence", svc((w) => (sec(w).evidenceIds = []))],
  ["section evidence not verified", svc((w) => (sec(w).evidenceIds = ["SVC-ZZ-99"]))],
  ["duplicate section ids", svc((w) => w.record.sections.push({ ...clone(sec(w)), body: ["A second written scope sheet lists the posts and exclusions agreed with the operations team for another site."] }))],
  ["malformed section", svc((w) => (w.record.sections = [{ id: "", heading: "", body: [], evidenceIds: [], claims: [] }]))],
  ["section body not strings", svc((w) => (sec(w).body = [1, 2]))],
  // F-08 dates and chronology
  ...["2026-02-30", "2026-04-31", "0000-01-01", "9999-12-31", "2026-13-01", "19/11/2026", "2026-1-9", ""].map((d) => [`approval date ${JSON.stringify(d)}`, svc((w) => (w.record.approval.approvedOn = d))]),
  ["approval dated after the decision date", svc((w) => (w.record.approval.approvedOn = "2026-11-20"))],
  // approval and status
  ["status unpublished", svc((w) => (w.record.status = "unpublished"))],
  ["status wrong case", svc((w) => (w.record.status = "APPROVED"))],
  ["no approval", svc((w) => (w.record.approval = null))],
  ["approval not owner", svc((w) => (w.record.approval.authorization = "editor"))],
  ["approval no approver", svc((w) => (w.record.approval.approvedBy = " "))],
  ["approval no reference", svc((w) => (w.record.approval.reference = ""))],
  ["approval other path", svc((w) => (w.record.approval.path = "/services/cctv-installation"))],
  ["layout not approved", svc((w) => (w.record.approval.layoutApproved = "true"))],
  ["approval no evidence", svc((w) => (w.record.approval.evidenceIds = []))],
  ["approval cites unknown evidence", svc((w) => w.record.approval.evidenceIds.push("NOPE-01"))],
  // F-09 manifest
  ["page not in the manifest", svc((w) => (w.deps.manifest = []))],
  ["manifest for another path", svc((w) => (w.deps.manifest[0].publicPath = "/services/cctv-installation"))],
  ["manifest route file wrong", svc((w) => (w.deps.manifest[0].routeFile = "app/services/other/page.tsx"))],
  ["manifest route file traversal", svc((w) => (w.deps.manifest[0].routeFile = "app/services/../../etc/page.tsx"))],
  ["manifest without title", svc((w) => (w.deps.manifest[0].title = ""))],
  ["manifest without description", svc((w) => (w.deps.manifest[0].description = ""))],
  // dependencies
  ["deps ledger null", svc((w) => (w.deps.ledger = null))],
  ["deps claims undefined", svc((w) => (w.deps.claims = undefined))],
  ["deps manifest null", svc((w) => (w.deps.manifest = null))],
  ["deps asOf invalid", svc((w) => (w.deps.asOf = "today"))],
  ["deps asOf impossible", svc((w) => (w.deps.asOf = "2026-02-30"))],
]

// ------------------------------------------------------------------------------------------ Milestone 5D.6 cases
const supersede = (w, id, attested, over = {}, approve = true) => {
  const old = w.deps.ledger.find((e) => e.id === id)
  const rid = `${id}-R2`
  old.supersededBy = rid
  w.deps.ledger.push(entry(rid, { replaces: id, scope: old.scope, attested: attested === undefined ? old.attested : attested, ...over }))
  if (approve) w.record.approval.evidenceIds.push(rid)
  return rid
}
const cw = ({ body, claims, approve, approvals }) => () => {
  return world(SERVICE, {
    sections: [{ id: "support", heading: "Support", body: [body, P2], evidenceIds: [primaryEvidence(SERVICE.publicPath)], claims }],
    approvedClaims: approve,
    compliance: true,
    claimApprovals: (approvals ?? claims).map((c) => ({ claimId: c.claimId, sectionId: "support", statement: c.statement, editorialApprovedBy: "Test Editor", complianceApprovedBy: "Test Compliance" })),
  })
}
const uni = (text) => withSecText(`Cover is available ${text} and each guard reports to a named supervisor at every post on each shift.`)
const flakyObject = (obj, key, bad, after = 1) => {
  let n = 0
  const out = {}
  for (const k of Object.keys(obj)) Object.defineProperty(out, k, { enumerable: true, get() { if (k === key && n++ >= after) return bad; return obj[k] } })
  return out
}

GOOD.push(
  ["F9-01 licence replaced by a same-family id with a valid expiry", () => hop(licence({})(), "CMP-01", [["CMP-02", { expiresOn: "2027-09-30" }]])],
  ["F9-01 licence replaced under an unregistered id with a valid expiry", () => hop(licence({})(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }]])],
  ["F9-01 non-licence root replaced under an unregistered id without an expiry", () => hop(world(SERVICE), "CMP-05", [["ZZZ-91", { expiresOn: null }]])],
  ["F9-01 non-licence root replaced by a same-profile company id", () => hop(world(SERVICE), "CMP-05", [["CMP-06", { expiresOn: null }]])],
  ["F9-01 a chain of seventeen replacements", () => longChain(17)],
  ["F9-02 evidence that expires the day after the decision date (approval dated earlier)", () => { const w = world(SERVICE, { entryOver: { "CMP-05": { expiresOn: "2026-11-20", verifiedOn: "2026-11-17" } } }); w.record.approval.approvedOn = "2026-11-18"; return w }],
  ["F9-02 evidence that expires the day after the decision date", () => world(SERVICE, { entryOver: { "CMP-05": { expiresOn: "2026-11-20" } } })],
  ["F9-02 CLM-01 evidence with a valid expiry", () => world(SERVICE, { extraEvidence: ["CLM-01"], sectionEvidence: [primaryEvidence(SERVICE.publicPath), "CLM-01"], entryOver: { "CLM-01": { expiresOn: "2027-06-30" } } })],
  ["F7-05 evidence verified on the approval date itself", () => { const w = world(SERVICE, { entryOver: { "CNT-10": { verifiedOn: "2026-11-19" } } }); return w }],
  ["F7-05 a supersession chain of five entries", () => { const w = world(SERVICE); let prev = "CMP-05"; for (let i = 0; i < 5; i++) { const rid = `CMP-05-R${i + 2}`; w.deps.ledger.find((e) => e.id === prev).supersededBy = rid; w.deps.ledger.push(entry(rid, { replaces: prev, scope: "company" })); w.record.approval.evidenceIds.push(rid); prev = rid } return redigest(w) }],
  ["F5D5-01 corrected address via a replacement entry", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }); w.record.nap.streetAddress = "2 New Road"; return redigest(w) }],
  ["F5D5-01 corrected name via a replacement entry", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-01", { displayName: "Renamed Office", branchDesignation: "Regional Office" }); w.record.nap.displayName = "Renamed Office"; return redigest(w) }],
  ["F5D5-01 corrected phone via a replacement entry", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-05", { telephone: "+254700000009" }); w.record.nap.telephone = "+254700000009"; return redigest(w) }],
  ["F5D5-01 COM-05 replaced by an entry attesting the same primary phone", () => { const w = world(); supersede(w, "COM-05", { primaryPhone: siteConfig.contact.primaryPhone.e164 }); return w }],
  ["F5D5-01 three-step supersession chain ending in a valid current entry", () => { const w = world(); const b = supersede(w, "CMP-05", null); const old = w.deps.ledger.find((e) => e.id === b); old.supersededBy = "CMP-05-R3"; w.deps.ledger.push(entry("CMP-05-R3", { replaces: b, scope: old.scope })); w.record.approval.evidenceIds.push("CMP-05-R3"); return w }],
  ["F5D5-03 plain ASCII punctuation is accepted", () => redigest(withSecText("Guards stand at each entrance (the client's choice) and every post reports to a named supervisor - on each shift.")())],
  ["F5D5-04 evidence scoped to the page's own office", () => world(NAIROBI, { sectionEvidence: ["OFF-NBO-06"] })],
  ["F5D5-04 company-wide evidence on an office page", () => world(NAIROBI, { sectionEvidence: ["DIG-02"] })],
  ["F5D5-04 service evidence scoped to the page's own service", () => world(SERVICE, { sectionEvidence: ["SVC-MG-02"] })],
  ["F5D5-05 two claims, each bound to its own statement", cw({ body: "Cover is available 24/7 at every site and our guards are trained and report to a named supervisor each shift.", claims: [{ claimId: "availability-24-7", statement: "available 24/7" }, { claimId: "trained-personnel", statement: "trained" }], approve: ["availability-24-7", "trained-personnel"] })],
  ["F5D5-06 Branch Office designation", () => world(NAIROBI, { nap: { branchDesignation: "Branch Office" } })],
  ["F5D5-06 showroom designation on the office that may use it", () => world(NAKURU, { nap: { branchDesignation: "Regional Office & Showroom" } })],
  ["F5D5-10 dependencies are judged on one snapshot (flaky ledger entry)", () => { const w = world(); w.deps.ledger[0] = flakyObject(w.deps.ledger[0], "status", "CONFLICTED"); return w }],
  ["F5D5-10 dependencies are judged on one snapshot (flaky manifest title)", () => { const w = world(); w.deps.manifest[0] = flakyObject(w.deps.manifest[0], "title", "Best licensed guards available 24/7", 2); return w }],
  ["F5D5-10 dependencies are judged on one snapshot (flaky as-of date)", () => { const w = world(); w.deps = flakyObject(w.deps, "asOf", "2020-01-01", 1); return w }],
)

BAD.push(
  // F5D5-01
  ["F5D5-01 stale NAP name after the name evidence was replaced", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-01", { displayName: "Renamed Office", branchDesignation: "Regional Office" }); return w }],
  ["F5D5-01 stale NAP address after the address evidence was replaced", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }); return w }],
  ["F5D5-01 stale NAP phone after the phone evidence was replaced", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-05", { telephone: "+254700000009" }); return w }],
  ["F5D5-01 COM-05 replaced by an entry attesting a different phone", () => { const w = world(); supersede(w, "COM-05", { primaryPhone: "+254799999999" }); return w }],
  ["F5D5-01 corrected NAP but the approval omits the replacement", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }, {}, false); w.record.nap.streetAddress = "2 New Road"; return redigest(w) }],
  ["F5D5-01 replacement is expired", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }, { expiresOn: "2026-11-01" }); w.record.nap.streetAddress = "2 New Road"; return redigest(w) }],
  ["F5D5-01 replacement is revoked", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }, { revokedOn: "2026-11-15" }); w.record.nap.streetAddress = "2 New Road"; return redigest(w) }],
  ["F5D5-01 replacement has a different scope", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }, { scope: "company" }); w.record.nap.streetAddress = "2 New Road"; return redigest(w) }],
  ["F5D5-01 replacement verified after the approval", () => { const w = world(NAIROBI); supersede(w, "OFF-NBO-02", { streetAddress: "2 New Road", locality: "Testville" }, { verifiedOn: "2026-11-19" }); w.record.approval.approvedOn = "2026-11-18"; w.record.nap.streetAddress = "2 New Road"; return redigest(w) }],
  ["F5D5-01 circular supersession A to B to A", svc((w) => { setEntry(w, "CMP-05", { supersededBy: "CMP-05-R2", replaces: "CMP-05-R2" }); w.deps.ledger.push(entry("CMP-05-R2", { supersededBy: "CMP-05", replaces: "CMP-05" })) })],
  ["F5D5-01 chain whose last entry is revoked", svc((w) => { const b = supersede(w, "CMP-05", null); const o = w.deps.ledger.find((e) => e.id === b); o.supersededBy = "CMP-05-R3"; w.deps.ledger.push(entry("CMP-05-R3", { replaces: b, revokedOn: "2026-11-15" })); w.record.approval.evidenceIds.push("CMP-05-R3") })],
  ["F5D5-01 chain with a missing middle entry", svc((w) => { setEntry(w, "CMP-05", { supersededBy: "CMP-05-R2" }); w.deps.ledger.push(entry("CMP-05-R3", { replaces: "CMP-05-R2" })) })],
  // F5D5-03 Unicode
  ["F5D5-03 zero-width space in 24/7", uni("24​/7")],
  ["F5D5-03 soft hyphen in licensed", withSecText("Our licen­sed guards stand at each entrance the client chooses and report to a named supervisor on every shift.")],
  ["F5D5-03 fullwidth 24/7", uni("２４/７")],
  ["F5D5-03 mixed-width numeric claim", uni("24/７")],
  ["F5D5-03 non-breaking space in 24 hours", uni("24 hours")],
  ["F5D5-03 tab inside a claim", uni("24\t/7")],
  ["F5D5-03 newline inside text", uni("24\n/7")],
  ["F5D5-03 line separator", uni("24 /7")],
  ["F5D5-03 ideographic space", uni("24　hours")],
  ["F5D5-03 byte order mark", uni("﻿24/7")],
  ["F5D5-03 bidi override", uni("‮24/7")],
  ["F5D5-03 combining mark inside licensed", withSecText("Our liceṅsed guards stand at each entrance the client chooses and report to a named supervisor on every shift.")],
  ["F5D5-03 Cyrillic homoglyph in best", withSecText("Our bеst guards stand at each entrance the client chooses and report to a named supervisor on every shift.")],
  ["F5D5-03 Arabic-Indic digits", uni("٢٤/٧")],
  ["F5D5-03 ligature", withSecText("The ﬁnest guards stand at each entrance the client chooses and report to a named supervisor on every shift.")],
  ["F5D5-03 typographic ellipsis", withSecText("Guards stand at each entrance the client chooses… and every post reports to a named supervisor on each shift.")],
  ["F5D5-03 hidden character in a heading", svc((w) => (sec(w).heading = "Sc​ope"))],
  ["F5D5-03 hidden character in a NAP field", () => world(NAIROBI, { nap: { displayName: "Test​ Office" } })],
  ["F5D5-03 hidden character in an area name", () => world(NAIROBI, { coverage: { serviceIds: [], areas: ["West​lands"], evidenceIds: ["OFF-NBO-10"] } })],
  ["F5D5-03 hidden character in manifest title", svc((w) => (w.deps.manifest[0].title = "Test​ page"))],
  ["F5D5-03 hidden character in manifest description", svc((w) => (w.deps.manifest[0].description = "A neutral​ description of the page."))],
  ["F5D5-03 hidden character inside a bound claim statement", cw({ body: "Control room cover is available 24​/7 for every client site and guards report to a named supervisor.", claims: [{ claimId: "availability-24-7", statement: "available 24​/7" }], approve: ["availability-24-7"] })],
  // F5D5-04 office and service scope
  ["F5D5-04 Nairobi section cites Nakuru-only evidence", () => world(NAIROBI, { sectionEvidence: ["OFF-NAK-06"] })],
  ["F5D5-04 Nakuru section cites Rongo-only evidence", () => world(NAKURU, { sectionEvidence: ["OFF-RON-06"] })],
  ["F5D5-04 Rongo section cites Nairobi-only evidence", () => world(RONGO, { sectionEvidence: ["OFF-NBO-06"] })],
  ["F5D5-04 Nairobi coverage cites Nakuru-only evidence", () => world(NAIROBI, { coverage: { serviceIds: [], areas: ["Test Estate"], evidenceIds: ["OFF-NBO-10", "OFF-NAK-10"] } })],
  ["F5D5-04 approval cites another office's evidence", loc((w) => { w.deps.ledger.push(entry("OFF-NAK-06")); w.record.approval.evidenceIds.push("OFF-NAK-06") })],
  ["F5D5-04 service page cites office evidence", () => world(SERVICE, { sectionEvidence: ["OFF-NBO-06"] })],
  ["F5D5-04 service page cites another service's evidence", () => world(SERVICE, { sectionEvidence: ["SVC-CC-01"] })],
  ["F5D5-04 ledger scope metadata contradicts the evidence code", loc((w) => setEntry(w, "OFF-NBO-06", { scope: "company" }))],
  ["F5D5-04 ledger scope names another office", loc((w) => setEntry(w, "OFF-NBO-06", { scope: "office:nakuru" }))],
  ["F5D5-04 evidence with no recognisable scope", () => world(SERVICE, { sectionEvidence: ["ZZ-99"] })],
  // F5D5-05 claim scope
  ["F5D5-05 availability claim bound to a statement that also carries licensing, award and trust wording", cw({ body: "Our licensed, award-winning guards are available 24/7 across the region and are trusted by every client we serve.", claims: [{ claimId: "availability-24-7", statement: "Our licensed, award-winning guards are available 24/7 across the region and are trusted by every client we serve." }], approve: ["availability-24-7"] })],
  ["F5D5-05 licensing claim cannot unlock availability wording", cw({ body: "Our guards are licensed and available 24/7 across the region and report to a named supervisor each shift.", claims: [{ claimId: "licensed-compliant", statement: "licensed and available 24/7" }], approve: ["licensed-compliant"] })],
  ["F5D5-05 trusted claim cannot unlock best", cw({ body: "The best and trusted guards stand at the entrances the client chooses and report to a supervisor each shift.", claims: [{ claimId: "trusted-by-clients", statement: "best and trusted" }], approve: ["trusted-by-clients"] })],
  ["F5D5-05 claim with no scope categories cannot unlock anything", cw({ body: "Our control room is licensed and technology-driven and every post reports to a named supervisor each shift.", claims: [{ claimId: "technology-driven", statement: "licensed and technology-driven" }], approve: ["technology-driven"] })],
  ["F5D5-05 a claim with no explicit scope authorises nothing", cw({ body: "Control room cover is available 24/7 for every client site and guards report to a named supervisor each shift.", claims: [{ claimId: "brand-new-claim", statement: "available 24/7" }], approve: ["brand-new-claim"] })],
  ["F5D5-05 claim statement contains no wording the claim covers", cw({ body: "Control room cover is available 24/7 for every client site and guards report to a named supervisor each shift.", claims: [{ claimId: "availability-24-7", statement: "report to a named supervisor" }], approve: ["availability-24-7"] })],
  ["F5D5-05 years claim cannot unlock a client count", cw({ body: "Serving over 500 clients for years, our guards report to a named supervisor at each post on every shift.", claims: [{ claimId: "years-operating", statement: "over 500 clients" }], approve: ["years-operating"] })],
  // 5D.6 mutation-harness additions: each pins a check that no earlier case depended on
  ["F-06 a bound claim statement that is not in the section text", cw({ body: "Guards stand at each entrance the client chooses and report to a named supervisor on every shift.", claims: [{ claimId: "availability-24-7", statement: "available 24/7" }], approve: ["availability-24-7"] })],
  ["F5D5-05 a bound claim that covers no wording in its statement", cw({ body: "Guards stand at each entrance the client chooses and report to a named supervisor on every shift.", claims: [{ claimId: "availability-24-7", statement: "report to a named supervisor" }], approve: ["availability-24-7"] })],
  ["F-06 claim wording elsewhere in the section is not covered by position", cw({ body: "Cover is available 24/7 at every site, and the control room is also open 24 hours for emergencies at each post.", claims: [{ claimId: "availability-24-7", statement: "available 24/7" }], approve: ["availability-24-7"] })],
  ["F5D5-05 availability claim cannot unlock response-time wording", cw({ body: "Cover is available 24/7 and response is rapid at every post on each shift for the client.", claims: [{ claimId: "availability-24-7", statement: "available 24/7 and response is rapid" }], approve: ["availability-24-7"] })],
  ["F5D5-03 ogham space mark", uni("24\u1680hours")],
  ["F5D5-03 en space", uni("24\u2002hours")],
  ["F5D5-03 combining mark with no precomposed form", withSecText("Guards stand at each entrance the client chooses and a\u20D7 named supervisor reports on every shift.")],
  ["F5D5-06 head office designation without the head-office evidence cited by the approval", () => { const w = world(NAIROBI, { nap: { branchDesignation: "Head Office" } }); w.record.approval.evidenceIds = w.record.approval.evidenceIds.filter((id) => id !== "COM-03"); return w }],
  ["F5D5-09 an evidence reference added after review", [() => { const w = world(SERVICE, { extraEvidence: ["CNT-10"] }); if (!w.record.evidenceRefs.includes("CNT-10")) w.record.evidenceRefs = [...w.record.evidenceRefs, "CNT-10"]; return w }, true]],
  ["F5D5-09 the manifest title changed after review", [() => { const w = world(); w.deps.manifest[0].title = "A different test page"; return w }, true]],
  ["F5D5-09 a claim binding changed after review (text, approval and ledger all consistent)", [() => { const w = claimWorld(); sec(w).claims[0].statement = "24/7"; w.record.approval.claimApprovals[0].statement = "24/7"; return w }, true]],
  ["F5D5-09 the NAP changed after review (attestation updated to match)", [() => { const w = world(NAIROBI); w.record.nap.displayName = "Renamed Test Office"; setEntry(w, "OFF-NBO-01", { attested: { displayName: "Renamed Test Office", branchDesignation: "Regional Office" } }); return w }, true]],
  // F7-02 ranking claims (the "#1" alternative could never match before 5D.8)
  ...["are #1 in the region", "were ranked #1 last year", "are Kenya's #1 security company", "are No. 1 for patrol cover", "are number one for site cover", "are the (#1) choice", "hold the No.1 position", "are No 1 in Kenya for guarding"].map((t) => [`F7-02 ranking claim ${JSON.stringify(t)} without an approved claim`, withSecText(`Our patrol teams ${t} and every post reports to a named supervisor at the start of each shift.`)]),
  // F7-01 licence evidence keeps its root requirements when replaced
  ["F7-01 licence replaced under an unrelated id without an expiry", () => { const w = licence({})(); const old = w.deps.ledger.find((e) => e.id === "CMP-01"); old.supersededBy = "ZZZ-91"; w.deps.ledger.push(entry("ZZZ-91", { replaces: "CMP-01", scope: "company", expiresOn: null })); w.record.approval.evidenceIds.push("ZZZ-91"); return w }],
  ["F7-01 licence replaced under a same-family id without an expiry", () => { const w = licence({})(); const old = w.deps.ledger.find((e) => e.id === "CMP-01"); old.supersededBy = "CMP-01-R1"; w.deps.ledger.push(entry("CMP-01-R1", { replaces: "CMP-01", scope: "company", expiresOn: null })); w.record.approval.evidenceIds.push("CMP-01-R1"); return w }],
  // 5D.8 mutation-harness corrections: invariants that no earlier case pinned
  ["F5D5-05 an unscoped claim bound to neutral text is not tolerated", () => { const w = world(SERVICE, { approvedClaims: ["brand-new-claim"], compliance: true }); w.record.sections[0].claims = [{ claimId: "brand-new-claim", statement: "written scope sheet" }]; w.record.approval.claimApprovals = [{ claimId: "brand-new-claim", sectionId: w.record.sections[0].id, statement: "written scope sheet", editorialApprovedBy: "E", complianceApprovedBy: "C" }]; return w }],
  ["F5D5-01 a superseded entry whose scope differs from its correct replacement", () => { const w = world(NAIROBI); const old = w.deps.ledger.find((e) => e.id === "OFF-NBO-02"); old.supersededBy = "OFF-NBO-52"; old.scope = "company"; w.deps.ledger.push(entry("OFF-NBO-52", { replaces: "OFF-NBO-02", scope: "office:nairobi", attested: old.attested })); w.record.approval.evidenceIds.push("OFF-NBO-52"); return w }],
  ["F5D5-01 a supersession chain of twenty entries", () => { const w = world(SERVICE); let prev = "CMP-05"; for (let i = 0; i < 20; i++) { const rid = `CMP-05-R${i + 2}`; w.deps.ledger.find((e) => e.id === prev).supersededBy = rid; w.deps.ledger.push(entry(rid, { replaces: prev, scope: "company" })); w.record.approval.evidenceIds.push(rid); prev = rid } return w }],
  // ---- 5D.10 (F9-01, F9-02, F9-03): every canonical identity in a chain counts
  ["F9-01 non-licence root replaced by the licence id CMP-01 without an expiry", () => hop(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: null }]])],
  ["F9-01 non-licence root replaced by the licence id CMP-01 with a valid expiry", () => hop(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: "2027-09-30" }]])],
  ["F9-01 licence root replaced by a different company id with a valid expiry", () => hop(licence({})(), "CMP-01", [["CMP-06", { expiresOn: "2027-09-30" }]])],
  ["F9-01 licence id in the middle of a chain with a non-licence root", () => hop(world(SERVICE), "CMP-05", [["CMP-01", { expiresOn: "2027-09-30" }], ["ZZZ-92", { expiresOn: "2027-09-30" }]])],
  ["F9-01 non-licence id at the end of a licence chain", () => hop(licence({})(), "CMP-01", [["ZZZ-91", { expiresOn: "2027-09-30" }], ["CMP-06", { expiresOn: "2027-09-30" }]])],
  ["F9-01 office root replaced by a registered company id", () => { const w = world(NAIROBI); const old = w.deps.ledger.find((e) => e.id === "OFF-NBO-02"); return hop(w, "OFF-NBO-02", [["COM-88", { attested: old.attested }]]) }],
  ["F9-01 licence id at the end of a 17-replacement chain", () => longChain(17, "CMP-01")],
  ["F9-02 CLM-01 evidence without an expiry", () => world(SERVICE, { extraEvidence: ["CLM-01"], sectionEvidence: [primaryEvidence(SERVICE.publicPath), "CLM-01"], entryOver: { "CLM-01": { expiresOn: null } } })],
  ["F9-02 CLM-01 replaced under an unrelated id without an expiry", () => hop(world(SERVICE, { extraEvidence: ["CLM-01"], sectionEvidence: [primaryEvidence(SERVICE.publicPath), "CLM-01"], entryOver: { "CLM-01": { expiresOn: "2027-06-30" } } }), "CLM-01", [["ZZZ-91", { expiresOn: null }]])],
  ["F9-02 evidence that expires on the decision date", () => world(SERVICE, { entryOver: { "CMP-05": { expiresOn: "2026-11-19" } } })],
  // the approval is dated BEFORE the decision date, so only the decision-date comparison can refuse this entry
  ["F9-02 evidence that expires on the decision date (approval dated earlier)", () => { const w = world(SERVICE, { entryOver: { "CMP-05": { expiresOn: "2026-11-19", verifiedOn: "2026-11-17" } } }); w.record.approval.approvedOn = "2026-11-18"; return w }],
  ...["are Number-one in Kenya", "are #one in Kenya", "are 1st in Kenya", "are first-ranked", "are ranked first", "are the first choice for security", "are numero uno"].map((t) => [`F9-03 ranking claim ${JSON.stringify(t)} without an approved claim`, withSecText(`Our patrol teams ${t} and every post reports to a named supervisor at the start of each shift.`)]),
  // R04B-01 claims policy: pricing CLAIMS stay blocked on pages (no claim scope permits the pricing category)
  ...PRICING_BLOCKED.map(([n, t]) => [`R04B-01 pricing claim: ${n}`, withSecText(t)]),
  // F5D5-06 designation allowlist
  ...["Main Office", "Corporate Office", "Head Quarters", "HQ", "head office", "Regional Office ", "Branch", "Showroom", "Headquarters"].map((d) => [`F5D5-06 designation ${JSON.stringify(d)} is not allowlisted`, () => world(NAIROBI, { nap: { branchDesignation: d } })]),
  ["F5D5-06 head office attested for a different office", () => world(NAIROBI, { nap: { branchDesignation: "Head Office" }, headOfficeFor: "Nakuru" })],
  ["F5D5-06 showroom designation on an office that may not use it", () => world(NAIROBI, { nap: { branchDesignation: "Regional Office & Showroom" } })],
  ["F5D5-06 designation wording in the display name", () => world(NAIROBI, { nap: { displayName: "Test Branch" } })],
  ["F5D5-06 head-quarters wording in the display name", () => world(NAIROBI, { nap: { displayName: "Test HQ" } })],
  // F5D5-09 reviewed-content digest (cases build then edit content WITHOUT refreshing the digest)
  ["F5D5-09 a paragraph changed after review", [() => { const w = world(); sec(w).body[1] = "A written scope sheet lists the posts, the shift pattern and the exclusions agreed with the operations team before any guard begins."; return w }, true]],
  ["F5D5-09 the heading changed after review", [() => { const w = world(); sec(w).heading = "Scope of work"; return w }, true]],
  ["F5D5-09 the manifest description changed after review", [() => { const w = world(); w.deps.manifest[0].description = "A different neutral description of the page."; return w }, true]],
  ["F5D5-09 a section's evidence list changed after review", [() => { const w = world(); sec(w).evidenceIds = [...sec(w).evidenceIds, "CNT-10"]; return w }, true]],
  ["F5D5-09 the NAP area list changed after review", [() => { const w = world(NAIROBI, { coverage: { serviceIds: [], areas: ["Test Estate"], evidenceIds: ["OFF-NBO-10"] } }); w.record.verifiedCoverage.areas = ["Other Estate"]; return w }, true]],
  ["F5D5-09 a bound claim statement changed after review", [() => { const w = claimWorld(); const s = sec(w); const n = "support is available 24/7"; s.body[0] = s.body[0].replace("available 24/7", n); s.claims[0].statement = n; w.record.approval.claimApprovals[0].statement = n; return w }, true]],
  ["F5D5-09 editorial digest missing", svc((w) => delete w.record.approval.editorialReview.contentDigest)],
  ["F5D5-09 editorial digest malformed", svc((w) => (w.record.approval.editorialReview.contentDigest = "abc"))],
  ["F5D5-09 editorial digest of different content", [() => { const w = world(); w.record.approval.editorialReview.contentDigest = "1".repeat(64); return w }, true]],
  ["F5D5-09 compliance digest of different content", [() => { const w = claimWorld(); w.record.approval.complianceReview.contentDigest = "1".repeat(64); return w }, true]],
  ["F5D5-09 digest taken from another page", [() => { const w = world(); w.record.approval.editorialReview.contentDigest = world(NAIROBI).record.approval.editorialReview.contentDigest; return w }, true]],
  // F5D5-10 dependency snapshots
  ["F5D5-10 ledger entry whose fields are inherited from a prototype", svc((w) => { w.deps.ledger[2] = Object.create(w.deps.ledger[2]) })],
  ["F5D5-10 cyclic dependency data", svc((w) => { w.deps.ledger[2].self = w.deps.ledger[2] })],
  ["F5D5-10 claims dependency whose accessor throws", svc((w) => { w.deps.claims = Object.defineProperty([], "0", { enumerable: true, get() { throw new Error("boom") } }) })],
)

/** Runs every case against `gate` (a module exporting evaluatePublication). Returns [{name, ok}]; ok means the gate behaved correctly. */
export function runCases(gate) {
  setDigestFn(gate.contentDigest)
  try { return runCasesWith(gate) } finally { setDigestFn(null) }
}
function runCasesWith(gate) {
  const results = []
  for (const [name, build] of GOOD) {
    let ok = false
    try { const w = build(); ok = gate.evaluatePublication(w.record, w.deps).published === true } catch { ok = false }
    results.push({ name: `accepts: ${name}`, ok })
  }
  // every planned page can be published in a synthetic world (and only there)
  {
    let ok = true
    for (const base of ALL_PAGE_RECORDS) { try { const w = world(base); ok &&= gate.evaluatePublication(w.record, w.deps).published === true } catch { ok = false } }
    results.push({ name: "accepts: every planned page in a synthetic world", ok })
  }
  for (const [name, item] of BAD) {
    const [build, keepDigest] = Array.isArray(item) ? item : [item, false]
    let ok = false
    let reasons = []
    try { const w = build(); if (!keepDigest) redigest(w); const d = gate.evaluatePublication(w.record, w.deps); reasons = d.reasons; ok = d.published === false } catch { ok = false }
    results.push({ name: `rejects: ${name}`, ok, reasons })
  }
  // hostile and malformed records
  const hostile = new Proxy({}, { get() { throw new Error("boom") } })
  for (const [n, v] of [["undefined", undefined], ["null", null], ["number", 0], ["string", "x"], ["array", []], ["empty object", {}], ["function", () => true], ["hostile proxy", hostile], ["symbol-valued field", { kind: Symbol("s") }]]) {
    let ok = false
    try { ok = gate.evaluatePublication(v, world().deps).published === false } catch { ok = false }
    results.push({ name: `rejects: ${n} record`, ok })
  }
  // sibling duplicate text
  {
    const a = world(SERVICE), b = world(NAIROBI)
    let ok = false
    try { ok = gate.evaluatePublication(a.record, a.deps, [b.record]).published === false && gate.evaluatePublication(a.record, a.deps, []).published === true } catch { ok = false }
    results.push({ name: "rejects: paragraph copied from a sibling page", ok })
  }
  // sibling records are judged on a frozen copy (F7-04)
  {
    const a = world(SERVICE)
    const p0 = a.record.sections[0].body[0]
    const throwing = { get sections() { throw new Error("boom") } }
    const hostile = new Proxy({}, { get() { throw new Error("boom") } })
    const flipping = (() => { let n = 0; return { get sections() { n++; return n > 1 ? [] : [{ body: [p0] }] } } })()
    for (const [n, sib] of [["a sibling whose getter throws", throwing], ["a hostile proxy sibling", hostile], ["a sibling whose getter changes between reads", flipping], ["a sibling with a circular structure", (() => { const c = { sections: [] }; c.self = c; return c })()]]) {
      let ok = false
      let reasons = []
      try { const d = gate.evaluatePublication(a.record, a.deps, [sib]); reasons = d.reasons; ok = d.published === false } catch { ok = false }
      results.push({ name: `rejects: ${n} (siblings are snapshotted)`, ok, reasons })
    }
    let ok = false
    try { ok = gate.evaluatePublication(a.record, a.deps, "not a list").published === false && gate.evaluatePublication(a.record, a.deps, [{ sections: [{ body: ["An entirely different sibling paragraph about another subject, long enough to count as a paragraph."] }] }]).published === true } catch { ok = false }
    results.push({ name: "rejects: siblings that are not a list", ok })
    // F9-04: every malformed shape is refused, never silently ignored
    const sparse = new Array(2); sparse[0] = { sections: [] }
    const goodSib = { sections: [{ body: ["An entirely different sibling paragraph about another subject, long enough to count as a paragraph."] }] }
    for (const [n, sibs] of [["null sibling", [null]], ["undefined sibling", [undefined]], ["function sibling", [() => 1]], ["sparse sibling list", sparse], ["sibling without sections", [{}]], ["sibling whose sections are not a list", [{ sections: "x" }]], ["sibling section without a body", [{ sections: [{}] }]], ["sibling whose body is not a list", [{ sections: [{ body: "x" }] }]], ["sibling body with a non-string", [{ sections: [{ body: ["ok", 5] }] }]], ["sibling with inherited sections", [Object.create({ sections: [] })]], ["class instance sibling", [new (class Sib { constructor() { this.sections = [] } })()]], ["sibling whose sections is an empty string", [{ sections: "" }]], ["list that is a proxy", new Proxy([goodSib], { get() { throw new Error("boom") } })]]) {
      let ok = false, reasons = []
      try { const d = gate.evaluatePublication(a.record, a.deps, sibs); reasons = d.reasons; ok = d.published === false && d.reasons.length === 1 } catch { ok = false }
      results.push({ name: `rejects: F9-04 ${n}`, ok, reasons })
    }
    let okValid = false
    try { okValid = gate.evaluatePublication(a.record, a.deps, [goodSib, { sections: [] }]).published === true } catch { okValid = false }
    results.push({ name: "accepts: F9-04 valid static sibling records", ok: okValid })
    // a valid sibling copy of a paragraph is still caught, and later mutation of the sibling cannot matter
    const sib = { sections: [{ body: [p0] }] }
    let ok2 = false
    try { const d = gate.evaluatePublication(a.record, a.deps, [sib]); sib.sections[0].body[0] = "changed"; ok2 = d.published === false } catch { ok2 = false }
    results.push({ name: "rejects: paragraph copied from a plain sibling record", ok: ok2 })
  }
  // default dependencies are the real, closed ones
  {
    let ok = false
    try { ok = gate.evaluatePublication(world().record).published === false } catch { ok = false }
    results.push({ name: "rejects: synthetic approved record against the real registries", ok })
  }
  return results
}

/** For the 5D.6 cases: the reason the gate gives must be the one the case targets (not an incidental failure). */
export const EXPECTED_REASON = {
  "F5D5-01": /currently attested|replacement|supersession|expired|revoked|verified after|different scopes|current evidence|circular|primary phone/,
  "F5D5-03": /control, formatting|whitespace other|combining marks|compatibility or fullwidth|outside the Latin|non-ASCII digits/,
  "F5D5-04": /scoped to|valid evidence scope/,
  "F5D5-05": /no bound, approved claim covers|no explicit scope|contains no wording/,
  "F5D5-06": /designation|display name contains|evidence COM-03/,
  "F7-01": /licence evidence without an expiry date/,
  "F7-02": /no bound, approved claim covers/,
  "F9-01": /mixes canonical evidence identities/,
  "F9-02": /licence evidence without an expiry date|is expired/,
  "F9-03": /no bound, approved claim covers/,
  "F9-04": /sibling records are malformed/,
  "F5D5-09": /content digest|different content/,
  "F5D5-10": /dependencies are malformed|not in the ledger|without a valid id|missing verification metadata/,
}
