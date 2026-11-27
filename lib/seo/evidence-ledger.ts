import { deepFreeze } from "@/lib/seo/freeze"
import type { EvidenceRecord } from "@/lib/seo/page-models"

/**
 * Independent evidence on file, keyed by the Business Verification register ids (docs/seo/business-verification on PR #7).
 *
 * EMPTY BY DESIGN. Management has not supplied evidence, so nothing is VERIFIED. An entry is added only when a
 * named person has reviewed an independent document (never website configuration, the claims registry or a
 * legacy PDF), in a reviewable pull request. Frozen at load.
 */
export const EVIDENCE_LEDGER: readonly EvidenceRecord[] = deepFreeze([])
