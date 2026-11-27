// Resolves keywords and draft metadata for a record FROM the existing registry (never duplicated into records).
import { PLANNED_PAGES } from "@/lib/seo/planned-pages"
import type { PageRecord } from "@/lib/seo/page-models"

export function resolvePlanned(record: PageRecord) {
  const planned = PLANNED_PAGES.find((p) => p.path === record.plannedPath)
  if (!planned) throw new Error(`No planned page for ${record.plannedPath}`)
  return {
    name: planned.name,
    primaryKeyword: planned.primaryKeyword,
    supportingKeywords: planned.supportingKeywords,
    geography: planned.geography,
    /** Draft metadata from the workbook plan. Proposed only; nothing renders it until a page is published. */
    proposedTitle: planned.titleDraft,
    proposedDescription: planned.descriptionDraft,
    claimSensitiveKeywordCount: planned.claimSensitiveKeywordCount,
  }
}
