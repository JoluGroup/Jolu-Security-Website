// CANONICAL publication requirements for the ten planned pages. The gate reads this table; a page record cannot
// add, drop or replace an entry. Ids refer to the Business Verification register (docs/seo/business-verification on
// PR #7): the "BLOCKS PUBLICATION" items per page, plus the office identity items now needed to display verified NAP.
import { deepFreeze } from "@/lib/seo/freeze"
import type { LocationSlug, ServiceSlug } from "@/lib/seo/page-models"
import type { ServiceId } from "@/lib/services"

const COMMON_SITE = ["COM-05", "CMP-07", "CNT-10", "CLM-10", "DIG-02", "DIG-03", "DIG-05", "DIG-08"] as const
const service = (code: string) => [...COMMON_SITE, `SVC-${code}-01`, `SVC-${code}-02`, `SVC-${code}-07`, "CMP-05", "CNT-01"] as const
const office = (code: string) => [...COMMON_SITE, ...["01", "02", "05", "06", "07", "10"].map((n) => `OFF-${code}-${n}`)] as const

export const REQUIRED_EVIDENCE = deepFreeze({
  "/services/manned-guarding": service("MG"),
  "/services/cctv-installation": service("CC"),
  "/services/electric-fencing": service("EF"),
  "/services/events-security": service("EV"),
  "/services/k9-unit-services": service("K9"),
  "/services/alarm-response": service("AR"),
  "/services/vip-close-protection": service("VP"),
  "/locations/nairobi": office("NBO"),
  "/locations/nakuru": office("NAK"),
  "/locations/rongo": office("RON"),
} as const satisfies Record<string, readonly string[]>)

/** Canonical identity of each page: which service or office it describes, and the entries that attest its NAP. */
export const SERVICE_IDENTITY: Readonly<Record<ServiceSlug, { serviceId: ServiceId }>> = deepFreeze({
  "manned-guarding": { serviceId: "manned-guarding" },
  "cctv-installation": { serviceId: "cctv-installation" },
  "electric-fencing": { serviceId: "electric-fencing" },
  "events-security": { serviceId: "events-security" },
  "k9-unit-services": { serviceId: "k9-unit" },
  "alarm-response": { serviceId: "alarm-response" },
  "vip-close-protection": { serviceId: "vip-close-protection" },
} as const)

export const LOCATION_IDENTITY: Readonly<
  Record<LocationSlug, { officeName: "Nairobi" | "Nakuru" | "Migori"; nameEvidence: string; addressEvidence: string; phoneEvidence: string; servicesEvidence: string; areasEvidence: string }>
> = deepFreeze({
  nairobi: { officeName: "Nairobi", nameEvidence: "OFF-NBO-01", addressEvidence: "OFF-NBO-02", phoneEvidence: "OFF-NBO-05", servicesEvidence: "OFF-NBO-06", areasEvidence: "OFF-NBO-10" },
  nakuru: { officeName: "Nakuru", nameEvidence: "OFF-NAK-01", addressEvidence: "OFF-NAK-02", phoneEvidence: "OFF-NAK-05", servicesEvidence: "OFF-NAK-06", areasEvidence: "OFF-NAK-10" },
  // The website's office record is "Migori"; the single public page is Rongo (owner decision, Milestone 5A.1).
  rongo: { officeName: "Migori", nameEvidence: "OFF-RON-01", addressEvidence: "OFF-RON-02", phoneEvidence: "OFF-RON-05", servicesEvidence: "OFF-RON-06", areasEvidence: "OFF-RON-10" },
} as const)

/**
 * The ONLY branch designations a location page may display. Any other value is rejected, so wording cannot slip past a
 * pattern list. Each entry names the evidence it additionally needs. This list approves nothing: it is the vocabulary a
 * verified designation must come from.
 *  - `offices`: pages that may use it (omit for any office).
 *  - `attestedBy`: the evidence entry that must attest `{ [key]: <that page's office name> }`.
 */
export const DESIGNATIONS: Readonly<Record<string, { evidenceIds: readonly string[]; offices?: readonly LocationSlug[]; attestedBy?: { id: string; key: string } }>> = deepFreeze({
  "Regional Office": { evidenceIds: [] },
  "Branch Office": { evidenceIds: [] },
  "Head Office": { evidenceIds: ["COM-03"], attestedBy: { id: "COM-03", key: "headOffice" } },
  "Regional Office & Showroom": { evidenceIds: ["OFF-NAK-11"], offices: ["nakuru"] },
} as const)

/** Designation wording is not allowed in a display name; it belongs in the allowlisted `branchDesignation` only. */
export const DESIGNATION_WORDS = /\b(head ?office|head ?quarters?|hq|main office|corporate|flagship|showroom|branch|regional office)\b/i

/**
 * Explicit evidence scope. Every ledger entry carries a `scope` string, and the gate requires it to equal the scope
 * this table derives from the evidence code: "company", "office:<location slug>" or "service:<service slug>". A page may
 * use company-wide evidence and evidence scoped to its own office or service, nothing else. An id that matches no code
 * here has no scope and is rejected.
 */
const OFFICE_CODES = { NBO: "nairobi", NAK: "nakuru", RON: "rongo" } as const
const SERVICE_CODES = { MG: "manned-guarding", CC: "cctv-installation", EF: "electric-fencing", EV: "events-security", K9: "k9-unit-services", AR: "alarm-response", VP: "vip-close-protection" } as const
export function expectedScope(id: unknown): string | null {
  if (typeof id !== "string") return null
  if (/^(COM|CMP|CNT|CLM|DIG)-\d{2}$/.test(id)) return "company"
  const o = /^OFF-(NBO|NAK|RON)-\d{2}$/.exec(id)
  if (o) return `office:${OFFICE_CODES[o[1] as keyof typeof OFFICE_CODES]}`
  const v = /^SVC-(MG|CC|EF|EV|K9|AR|VP)-\d{2}$/.exec(id)
  if (v) return `service:${SERVICE_CODES[v[1] as keyof typeof SERVICE_CODES]}`
  return null
}

/** Licence, permit and registration evidence. Entries used by a page must carry an expiry date. */
export const LICENCE_EVIDENCE: readonly string[] = deepFreeze(["CMP-01", "CMP-02", "CMP-03", "CMP-04", "CLM-01"])

/**
 * Everything the gate requires of an evidence entry, derived from the CANONICAL ROOT id only (the id the evidence was
 * first registered under, found by following `replaces` back). A replacement entry may carry any id, so requirements are
 * never read from its own id: it inherits them from the root. A root that matches no known code has no requirements
 * profile and is rejected, so a future category must be added here (with its flags) before it can be used.
 */
export type EvidenceRequirements = { scope: string; expiryRequired: boolean }
export function rootRequirements(rootId: unknown): EvidenceRequirements | null {
  const scope = expectedScope(rootId)
  if (scope === null) return null
  return { scope, expiryRequired: typeof rootId === "string" && LICENCE_EVIDENCE.includes(rootId) }
}


/** The phone shown by the contact call to action must equal what COM-05 attests under this key. */
export const PHONE_ATTESTATION_KEY = "primaryPhone"
