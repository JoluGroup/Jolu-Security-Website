import { WORKBOOK_KEYWORDS } from "@/lib/seo/workbook-keywords"
import type { PlannedKeyword, WorkbookKeyword } from "@/lib/seo/types"

export { WORKBOOK_KEYWORDS }

/** Keywords the workbook assigns to the live homepage. */
export const HOME_KEYWORDS: readonly WorkbookKeyword[] = WORKBOOK_KEYWORDS.filter((k) => k.disposition === "homepage")

/** The workbook's /insights/... keywords: editorial topics for a future, expert-reviewed Blog. Not published. */
export const EDITORIAL_KEYWORDS: readonly WorkbookKeyword[] = WORKBOOK_KEYWORDS.filter((k) => k.disposition === "editorial")

/** Every workbook keyword planned for a path (after the Rongo/Migori consolidation). */
export function keywordsForPath(path: string): readonly WorkbookKeyword[] {
  return WORKBOOK_KEYWORDS.filter((k) => k.plannedPath === path)
}

/** Supporting keywords for a planned page: all of its keywords except the page's own primary keyword. */
export function supportingKeywordsFor(path: string, primaryKeyword: string): readonly PlannedKeyword[] {
  return keywordsForPath(path)
    .filter((k) => k.keyword.toLowerCase() !== primaryKeyword.toLowerCase())
    .map((k) => ({ id: k.id, keyword: k.keyword, priority: k.priority, claimSensitive: k.claimSensitive }))
}
