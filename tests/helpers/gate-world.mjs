// Synthetic "fully approved" worlds and the table of cases the publication gate must accept or reject.
// Shared by the behaviour tests and the automated mutation tests, so both exercise the same production code paths.
// NOTHING here is imported by application code; no real page is approved.
const { SERVICE_PAGE_RECORDS, LOCATION_PAGE_RECORDS, ALL_PAGE_RECORDS } = await import("@/lib/seo/page-records")
const { REQUIRED_EVIDENCE, LOCATION_IDENTITY } = await import("@/lib/seo/publication-requirements")
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

const entry = (id, over = {}) => ({ id, status: "VERIFIED", verifiedBy: "Test Verifier, Compliance", verifiedOn: "2026-11-18", document: "independent-test-document", expiresOn: null, revokedOn: null, supersededBy: null, replaces: null, attested: null, ...over })

/** A world in which `base` is fully approved. `opts` extends it (claims, licence evidence, NAP overrides). */
export function world(base = SERVICE, opts = {}) {
  const r = clone(base)
  const canonical = [...REQUIRED_EVIDENCE[r.publicPath]]
  const sectionEvidence = opts.sectionEvidence ?? [canonical[8]]
  r.status = "approved"
  r.sections = opts.sections ?? [{ id: "scope", heading: "Scope of the service", body: [P1, P2], evidenceIds: sectionEvidence, claims: [] }]
  const attested = { "COM-05": { primaryPhone: siteConfig.contact.primaryPhone.e164 } }
  if (r.kind === "location") {
    const ident = LOCATION_IDENTITY[r.slug]
    r.nap = { displayName: "Test Office", branchDesignation: "Regional Office", streetAddress: "1 Test Road", locality: "Testville", telephone: "+254700000001", ...(opts.nap ?? {}) }
    attested[ident.nameEvidence] = { displayName: r.nap.displayName, branchDesignation: r.nap.branchDesignation }
    attested[ident.addressEvidence] = { streetAddress: r.nap.streetAddress, locality: r.nap.locality }
    attested[ident.phoneEvidence] = { telephone: r.nap.telephone }
    if (opts.coverage) r.verifiedCoverage = clone(opts.coverage)
  }
  const ids = new Set([...canonical, ...sectionEvidence, ...(r.verifiedCoverage?.evidenceIds ?? []), ...(opts.extraEvidence ?? []), ...(opts.nap && /head office/i.test(opts.nap.branchDesignation ?? "") ? ["COM-03"] : [])])
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
    editorialReview: { reviewedBy: "Test Editor", reviewedOn: "2026-11-18", reference: "TEST-ED-1" },
    complianceReview: opts.compliance ? { reviewedBy: "Test Compliance", reviewedOn: "2026-11-18", reference: "TEST-CO-1" } : null,
    claimApprovals: opts.claimApprovals ?? [],
  }
  const manifest = [{ publicPath: r.publicPath, routeFile: `app/${r.publicPath.slice(1)}/page.tsx`, title: "Test page", description: "A neutral test description of the page." }]
  return { record: r, deps: { ledger, claims, manifest, asOf: AS_OF } }
}

/** A world whose single section makes the claim "availability-24-7", fully and explicitly approved. */
export function claimWorld(base = SERVICE) {
  const canonical = REQUIRED_EVIDENCE[base.publicPath]
  return world(base, {
    sections: [{ id: "support", heading: "Support", body: [CLAIM_PARA, P2], evidenceIds: [canonical[8]], claims: [{ claimId: "availability-24-7", statement: CLAIM_STATEMENT }] }],
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
  const w = world(SERVICE, { extraEvidence: ["CMP-01"], sectionEvidence: [REQUIRED_EVIDENCE[SERVICE.publicPath][8], "CMP-01"], entryOver: { "CMP-01": { expiresOn: "2027-06-30", ...over } } })
  return w
}
const svc = (fn) => () => {
  const w = world()
  fn(w)
  return w
}

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
  })],
  ["location with verified coverage", () => world(NAKURU, { coverage: { serviceIds: ["manned-guarding"], areas: ["Test Estate"], evidenceIds: ["OFF-NAK-06", "OFF-NAK-10"] } })],
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
  ["superseded evidence whose replacement does not point back", svc((w) => { setEntry(w, "CMP-07", { supersededBy: "CMP-07-R2" }); w.deps.ledger.push(entry("CMP-07-R2")) })],
  ["replacement of an entry that does not name it", svc((w) => w.deps.ledger.push(entry("CMP-07-R2", { replaces: "CMP-07" })))],
  ["superseded evidence whose replacement is revoked", svc((w) => { setEntry(w, "CMP-07", { supersededBy: "CMP-07-R2" }); w.deps.ledger.push(entry("CMP-07-R2", { replaces: "CMP-07", revokedOn: "2026-11-18" })) })],
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
  ["malformed attested values on a needed entry", svc((w) => setEntry(w, "CMP-07", { attested: { anything: 5 } }))],
  ["malformed claims on a neutral section", svc((w) => (sec(w).claims = [{ claimId: "" }]))],
  ["claim statement absent from neutral text", svc((w) => { sec(w).claims = [{ claimId: "availability-24-7", statement: "open all night" }]; w.deps.claims = w.deps.claims.map((c) => (c.id === "availability-24-7" ? { ...c, status: "approved", evidence: "e" } : c)); w.record.approval.complianceReview = { reviewedBy: "C", reviewedOn: "2026-11-18", reference: "R" }; w.record.approval.claimApprovals = [{ claimId: "availability-24-7", sectionId: "scope", statement: "open all night", editorialApprovedBy: "E", complianceApprovedBy: "C" }] })],
  ["a bound claim does not cover other claim-sensitive wording in the same paragraph", claimed((w) => { sec(w).body = [CLAIM_PARA + " Our licensed guards are also on every post, and each one reports to the named supervisor.", P2] })],
  ["two sections: approval for one does not cover the other", claimed((w) => { w.record.sections.push({ id: "support-2", heading: "More support", body: ["Escalation calls are answered by the control room that is available 24/7 and logged against the same named site contact."], evidenceIds: sec(w).evidenceIds, claims: [{ claimId: "availability-24-7", statement: CLAIM_STATEMENT }] }) })],
  ["malformed attested values", svc((w) => setEntry(w, "COM-05", { attested: { primaryPhone: 5 } }))],
  ...["status", "verifiedBy", "verifiedOn", "document", "expiresOn", "revokedOn", "supersededBy", "replaces", "attested"].map((k) => [`ledger entry missing key ${k}`, svc((w) => delete w.deps.ledger.find((e) => e.id === "COM-05")[k])]),
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

/** Runs every case against `gate` (a module exporting evaluatePublication). Returns [{name, ok}]; ok means the gate behaved correctly. */
export function runCases(gate) {
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
  for (const [name, build] of BAD) {
    let ok = false
    try { const w = build(); ok = gate.evaluatePublication(w.record, w.deps).published === false } catch { ok = false }
    results.push({ name: `rejects: ${name}`, ok })
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
  // default dependencies are the real, closed ones
  {
    let ok = false
    try { ok = gate.evaluatePublication(world().record).published === false } catch { ok = false }
    results.push({ name: "rejects: synthetic approved record against the real registries", ok })
  }
  return results
}
