// Client categories registry. Naming the kinds of clients served is a claim about operating history, so it needs
// evidence like everything in lib/claims.ts. Only "approved" entries with recorded evidence may render.
export type CategoryStatus = "approved" | "needs-evidence"

export type ClientCategory = {
  id: "estates" | "events" | "residential-communities" | "churches" | "schools" | "businesses"
  label: string
  status: CategoryStatus
  evidence: string | null
}

export const CLIENT_CATEGORIES: readonly ClientCategory[] = [
  { id: "estates", label: "Estates", status: "needs-evidence", evidence: null },
  { id: "events", label: "Events", status: "needs-evidence", evidence: null },
  { id: "residential-communities", label: "Residential communities", status: "needs-evidence", evidence: null },
  { id: "churches", label: "Churches", status: "needs-evidence", evidence: null },
  { id: "schools", label: "Schools", status: "needs-evidence", evidence: null },
  { id: "businesses", label: "Businesses", status: "needs-evidence", evidence: null },
]

/** Pure selector (exported so tests can exercise the approval rule with fixtures). */
export function selectApprovedClientCategories(entries: readonly ClientCategory[]): ClientCategory[] {
  return entries.filter((c) => c.status === "approved" && Boolean(c.evidence?.trim()))
}

export function getApprovedClientCategories(): ClientCategory[] {
  return selectApprovedClientCategories(CLIENT_CATEGORIES)
}
