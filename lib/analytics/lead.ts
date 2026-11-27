// Decides whether an enquiry response is a NEW confirmed lead (Release 04B, lane G). Pure: no DOM, no network.
//
// The enquiry API answers a replayed identical enquiry with HTTP 200 { ok: true, state: "accepted", duplicate: true }
// and the reference of the first submission (lib/enquiry/dedup.ts; nothing new is sent and no quota is used). That reply
// is a confirmed acceptance of the EARLIER enquiry, not a new lead, so generate_lead must not fire again for it.
//
// Fail closed: a lead is counted only for HTTP 2xx, ok === true, state === "accepted", a reference string, and NO
// duplicate marker at all. Any value in `duplicate` (true, "true", 1, null) means "not a new lead", so a malformed or
// future variant of the marker cannot inflate lead counts. Rejected, rate-limited, in-progress (409), uncertain,
// network-failure and test-mode outcomes are never leads.
export function isNewConfirmedLead(httpOk: unknown, result: unknown): boolean {
  if (httpOk !== true || typeof result !== "object" || result === null) return false
  const r = result as Record<string, unknown>
  if (!["ok", "state", "ref"].every((k) => Object.hasOwn(r, k))) return false
  return r.ok === true && r.state === "accepted" && typeof r.ref === "string" && r.ref.length > 0 && !Object.hasOwn(r, "duplicate")
}
