// Claims registry. Every factual or promotional claim about Jolu Security lives here.
// Only entries with status "approved" may render anywhere on the site.
// To approve a claim, set status to "approved" and record the supporting evidence
// (document, licence number, internal record) in `evidence`.
export type ClaimStatus = "approved" | "needs-evidence"

export type Claim = {
  id: string
  text: string
  status: ClaimStatus
  evidence: string | null
}

export const CLAIMS: readonly Claim[] = [
  { id: "licensed-compliant", text: "Licensed & Compliant", status: "needs-evidence", evidence: null },
  { id: "availability-24-7", text: "24/7 Availability", status: "needs-evidence", evidence: null },
  { id: "trained-personnel", text: "Trained Security Personnel", status: "needs-evidence", evidence: null },
  { id: "technology-driven", text: "Technology-Driven", status: "needs-evidence", evidence: null },
  { id: "trusted-by-clients", text: "Trusted by Clients", status: "needs-evidence", evidence: null },
  { id: "years-operating", text: "5+ years operating", status: "needs-evidence", evidence: null },
  { id: "guards-deployed", text: "250+ guards", status: "needs-evidence", evidence: null },
  { id: "reply-time", text: "Reply within 2 business hours", status: "needs-evidence", evidence: null },
]

export function getApprovedClaims(): Claim[] {
  return CLAIMS.filter((claim) => claim.status === "approved" && Boolean(claim.evidence?.trim()))
}
