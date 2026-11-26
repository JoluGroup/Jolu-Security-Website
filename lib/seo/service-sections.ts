// Flattens a service's draft content into the ContentSection[] the publication gate reviews, so that EVERYTHING the
// page renders from that content is inside the gate's claim scan, digest and evidence checks. A page may render this
// content only if its gate-published record carries exactly these sections (sectionsMatchContent); otherwise the
// generic section renderer is used. This is the binding that stops reviewed copy and rendered copy drifting apart.
import { AEO_HEADINGS, assessmentNote, AEO_TABLE_HEADERS, purposeHeading, requestLinkText } from "@/lib/seo/aeo-text"
import type { ServiceContent } from "@/lib/seo/aeo-types"
import type { ContentSection } from "@/lib/seo/page-models"
import { primaryEvidence } from "@/lib/seo/publication-requirements"
import { SERVICES } from "@/lib/services"
import { SERVICE_IDENTITY } from "@/lib/seo/publication-requirements"

const sentence = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`)
const join = (items: readonly string[]) => [items.join(" ")]

export function serviceDisplayName(content: ServiceContent): string {
  const id = SERVICE_IDENTITY[content.slug].serviceId
  return SERVICES.find((s) => s.id === id)?.name ?? content.h1
}

/**
 * Section evidence: the service-definition entry (SVC-xx-01) from the canonical requirements table. The final
 * evidence ids are assigned during the Business Verification review; this only names the entry the table already requires.
 */
function sectionEvidence(content: ServiceContent): readonly string[] {
  const id = primaryEvidence(`/services/${content.slug}`)
  if (id === null) throw new Error(`No primary evidence for /services/${content.slug}`)
  return [id]
}

export function contentToSections(content: ServiceContent): readonly ContentSection[] {
  const evidenceIds = sectionEvidence(content)
  const name = serviceDisplayName(content)
  const section = (id: string, heading: string, body: readonly string[]): ContentSection => ({ id, heading, body, evidenceIds, claims: [] })
  const m = content.budget
  const s = content.scope
  return [
    section("answer", AEO_HEADINGS.answer, [content.answer]),
    section("budget-factors", AEO_HEADINGS.budget, [
      `${sentence(m.caption)} ${m.intro}`,
      `${AEO_TABLE_HEADERS.factor}. ${AEO_TABLE_HEADERS.why}.`.concat(` ${m.scenarioA.label}. ${m.scenarioB.label}.`),
      ...m.rows.map((r) => `${r.factor}. ${r.whyItMatters} ${m.scenarioA.label}: ${r.scenarioA} ${m.scenarioB.label}: ${r.scenarioB}`),
      `${m.scenarioA.label}. ${m.scenarioA.description} ${m.scenarioB.label}. ${m.scenarioB.description}`,
      m.note,
    ]),
    section("purpose", purposeHeading(name), s.purpose),
    section("requirements", AEO_HEADINGS.requirements, join(s.buyerRequirements)),
    section("assessment", AEO_HEADINGS.assessment, [assessmentNote(name), ...join(s.assessmentSteps)]),
    section("scope", AEO_HEADINGS.scope, join(s.inScope)),
    section("confirm", AEO_HEADINGS.confirm, join(s.toConfirm)),
    section("regulatory", AEO_HEADINGS.regulatory, s.regulatory),
    section("request", AEO_HEADINGS.request, join([...s.quote, sentence(requestLinkText(name))])),
    section("faq", AEO_HEADINGS.faq, content.faqs.map((f) => `${f.question} ${f.answer}`)),
  ]
}

/** True when `sections` (a gate-published record's sections) equal the draft content's sections exactly. */
export function sectionsMatchContent(sections: unknown, content: ServiceContent): boolean {
  try {
    return JSON.stringify(sections) === JSON.stringify(contentToSections(content))
  } catch {
    return false
  }
}
