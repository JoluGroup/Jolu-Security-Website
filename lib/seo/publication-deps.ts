// Dependencies of the publication gate. This module has NO clock: with Cache Components, reading the current time
// in a prerendered route is a build error (blocking-prerender-current-time), and a clock would make decisions
// non-deterministic. Expiry is evaluated as of PUBLICATION_AS_OF, a committed date.
//
// Whoever publishes (or renews) a page sets PUBLICATION_AS_OF to the date of that reviewed change. While any page is
// published, tests/seo/publication-clock.test.mjs fails CI if the date is in the future, more than 31 days old, or if
// any evidence a published page depends on has expired by the real date, so stale evidence cannot go unnoticed.
import { EVIDENCE_LEDGER } from "@/lib/seo/evidence-ledger"
import type { EvidenceRecord } from "@/lib/seo/page-models"
import { PUBLICATION_MANIFEST, type ManifestEntry } from "@/lib/seo/publication-manifest"
import { CLAIMS, type Claim } from "@/lib/claims"

export const PUBLICATION_AS_OF = "2026-11-19"
export const MAX_AS_OF_AGE_DAYS = 31

export type GateDeps = {
  ledger: readonly EvidenceRecord[]
  claims: readonly Claim[]
  manifest: readonly ManifestEntry[]
  /** ISO calendar date the decision is made as of. */
  asOf: string
}

/** Production dependencies. */
export function defaultDeps(): GateDeps {
  return { ledger: EVIDENCE_LEDGER, claims: CLAIMS, manifest: PUBLICATION_MANIFEST, asOf: PUBLICATION_AS_OF }
}
