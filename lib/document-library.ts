// Downloadable document registry, mirroring lib/photo-library.ts.
//
// A document link renders only when every clearance criterion is "approved", or "not-applicable"
// with written evidence. Nothing is approved today, so no document link is rendered.
//
// Served-directory rule: an approved document must live under public/cleared/docs/ and its `href`
// must point there (typed `/cleared/docs/...`, enforced by `assertClearedDocHref` and tests/assets).
// Uncleared PDFs are withheld from this repository (see docs/assets/README.md). The old blobs remain in older
// PUBLIC history (main and earlier branches).

export type DocClearanceStatus = "pending" | "approved" | "not-applicable"
export type DocClearanceItem = { status: DocClearanceStatus; evidence: string | null }

export type DocumentClearance = {
  /** The owner has reviewed the final content and approved public distribution. */
  ownerApproval: DocClearanceItem
  /** Staff names, photos, contact details or client names inside the document are consented to. */
  personalDataAndConsent: DocClearanceItem
  /** Photographer, designer and font/stock rights for everything inside the document. */
  copyrightAndImages: DocClearanceItem
  /** Third-party logos, client marks, certifications and claims are permitted and accurate. */
  thirdPartyMarksAndClaims: DocClearanceItem
}

export const CLEARED_DOC_DIR = "/cleared/docs"
export type ClearedDocHref = `/cleared/docs/${string}.pdf`

export function isClearedDocHref(href: string): href is ClearedDocHref {
  return /^\/cleared\/docs\/[A-Za-z0-9._-]+\.pdf$/.test(href) && !href.includes("..")
}

export function assertClearedDocHref(href: string): ClearedDocHref {
  if (!isClearedDocHref(href)) throw new Error(`Document href must be under ${CLEARED_DOC_DIR}/: ${href}`)
  return href
}

export type DocumentEntry = {
  id: string
  label: string
  href: ClearedDocHref
  note: string
  clearance: DocumentClearance
}

export type ResolvedDocument = Pick<DocumentEntry, "label" | "href">

const pending = (): DocClearanceItem => ({ status: "pending", evidence: null })
const allPending = (): DocumentClearance => ({
  ownerApproval: pending(),
  personalDataAndConsent: pending(),
  copyrightAndImages: pending(),
  thirdPartyMarksAndClaims: pending(),
})

export const DOCUMENT_LIBRARY = {
  "company-profile": {
    id: "company-profile",
    label: "Company profile",
    href: "/cleared/docs/company-profile.pdf",
    note: "Original is withheld (see docs/assets/README.md). Contains photographs of people; needs consent and content review.",
    clearance: allPending(),
  },
  brochure: {
    id: "brochure",
    label: "Brochure",
    href: "/cleared/docs/brochure.pdf",
    note: "Original is withheld (see docs/assets/README.md). Needs content, consent and rights review.",
    clearance: allPending(),
  },
} satisfies Record<string, DocumentEntry>

export type DocumentId = keyof typeof DOCUMENT_LIBRARY

export function isDocumentCleared(entry: DocumentEntry): boolean {
  return Object.values(entry.clearance).every((item) => {
    if (item.status === "pending") return false
    if (item.status === "not-applicable") return Boolean(item.evidence?.trim())
    return Boolean(item.evidence?.trim())
  })
}

/** Documents whose link may be rendered. Empty until the owner approves a document with evidence. */
export function clearedDocuments(): ResolvedDocument[] {
  const out: ResolvedDocument[] = []
  for (const entry of Object.values(DOCUMENT_LIBRARY) as DocumentEntry[]) {
    if (!isDocumentCleared(entry)) continue
    assertClearedDocHref(entry.href)
    out.push({ label: entry.label, href: entry.href })
  }
  return out
}
