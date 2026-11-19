// Evidence required before each planned page may be published: the "BLOCKS PUBLICATION" items of the Business
// Verification register (docs/seo/business-verification/evidence-register.md on PR #7), per page. Ids only; the
// questions, sources and status live in that register.
const COMMON_SITE = ["COM-05", "CMP-07", "CNT-10", "CLM-10", "DIG-02", "DIG-03", "DIG-05", "DIG-08"] as const

const service = (code: string) => [...COMMON_SITE, `SVC-${code}-01`, `SVC-${code}-02`, `SVC-${code}-07`, "CMP-05", "CNT-01"] as const
const office = (code: string, extra: readonly string[] = []) =>
  [...COMMON_SITE, ...["02", "05", "06", "07", "10"].map((n) => `OFF-${code}-${n}`), ...extra] as const

export const REQUIRED_EVIDENCE = {
  "/services/manned-guarding": service("MG"),
  "/services/cctv-installation": service("CC"),
  "/services/electric-fencing": service("EF"),
  "/services/events-security": service("EV"),
  "/services/k9-unit-services": service("K9"),
  "/services/alarm-response": service("AR"),
  "/services/vip-close-protection": service("VP"),
  "/locations/nairobi": office("NBO"),
  "/locations/nakuru": office("NAK"),
  // Rongo also needs a single agreed public name (OFF-RON-01).
  "/locations/rongo": office("RON", ["OFF-RON-01"]),
} as const satisfies Record<string, readonly string[]>
