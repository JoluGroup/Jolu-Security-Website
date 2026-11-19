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

/** Designation wording that additionally needs its own evidence before it may be displayed. */
export const DESIGNATION_EVIDENCE: readonly { pattern: RegExp; evidenceId: string }[] = [
  { pattern: /\b(head office|headquarters|HQ)\b/i, evidenceId: "COM-03" },
  { pattern: /\bshowroom\b/i, evidenceId: "OFF-NAK-11" },
]

/** Licence, permit and registration evidence. Entries used by a page must carry an expiry date. */
export const LICENCE_EVIDENCE: readonly string[] = deepFreeze(["CMP-01", "CMP-02", "CMP-03", "CMP-04", "CLM-01"])

/** The phone shown by the contact call to action must equal what COM-05 attests under this key. */
export const PHONE_ATTESTATION_KEY = "primaryPhone"
