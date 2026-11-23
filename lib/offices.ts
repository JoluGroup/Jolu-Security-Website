// Offices registry. Office locations are unverified until supported by approved JOLU Security evidence.
// Only entries with status "approved" (with evidence, label and address) may render or appear in structured data.
// The earlier addresses were copied from the separate JOLU Machineries site and were removed on purpose:
// do NOT transfer addresses from that site. To approve an office, record the JOLU Security-specific evidence
// (document, lease, registration record) in `evidence`, then fill `label` and `address`.
export type OfficeStatus = "approved" | "needs-evidence"

export type OfficeEntry = {
  id: string
  /** Planned-location identity used by the SEO publication gate (a name, not an address). */
  name: string
  status: OfficeStatus
  evidence: string | null
  label: string | null
  address: string | null
}

export type ApprovedOffice = { id: string; name: string; label: string; address: string }

export const OFFICES: readonly OfficeEntry[] = [
  { id: "nairobi", name: "Nairobi", status: "needs-evidence", evidence: null, label: null, address: null },
  { id: "nakuru", name: "Nakuru", status: "needs-evidence", evidence: null, label: null, address: null },
  { id: "migori", name: "Migori", status: "needs-evidence", evidence: null, label: null, address: null },
]

/** Names of the planned location identities (used only by the publication gate's identity check). */
export const PLANNED_OFFICE_NAMES: readonly string[] = OFFICES.map((o) => o.name)

/** Pure selector (exported so tests can exercise the approval rule with fixtures). */
export function selectApprovedOffices(entries: readonly OfficeEntry[]): ApprovedOffice[] {
  const out: ApprovedOffice[] = []
  for (const o of entries) {
    if (o.status === "approved" && o.evidence?.trim() && o.label?.trim() && o.address?.trim()) {
      out.push({ id: o.id, name: o.name, label: o.label, address: o.address })
    }
  }
  return out
}

export function getApprovedOffices(): ApprovedOffice[] {
  return selectApprovedOffices(OFFICES)
}
