// Types for answer-first (AEO) service page content. DRAFT content only: it is research-brief material (AEO workbook
// C01-C07, "draft briefs, not published claims"), not approved copy. A page that renders it must first pass the
// publication gate (lib/seo/publication-gate.ts), which scans every rendered string for claims.
import type { ServiceSlug } from "@/lib/seo/page-models"

/** One row of the budget-factor matrix. Cells describe relative size or scope in words; they never contain a price. */
export type BudgetFactorRow = {
  factor: string
  whyItMatters: string
  scenarioA: string
  scenarioB: string
}

export type BudgetFactorMatrix = {
  caption: string
  intro: string
  /** Hypothetical scenarios. The labels must say so; they are not past work, clients or quotes. */
  scenarioA: { label: string; description: string }
  scenarioB: { label: string; description: string }
  rows: readonly BudgetFactorRow[]
  note: string
}

export type ServiceScope = {
  purpose: readonly string[]
  /** What a buyer should require of any provider, phrased as requirements or questions, never as claims about JOLU SECURITY. */
  buyerRequirements: readonly string[]
  /** What a site assessment should cover. A proposed process, confirmed with the buyer; not a statement of verified operations. */
  assessmentSteps: readonly string[]
  inScope: readonly string[]
  /** Items that are confirmed with the buyer in the written quote. */
  toConfirm: readonly string[]
  regulatory: readonly string[]
  quote: readonly string[]
}

export type FaqItem = { question: string; answer: string }

export type ServiceContent = {
  slug: ServiceSlug
  /** AEO workbook brief id, for traceability (docs/seo/release04-evidence-gated-inventory.md). */
  briefId: "C01" | "C02" | "C03" | "C04" | "C05" | "C06" | "C07"
  status: "draft-not-approved"
  /** Segment of the page title (the root template adds " | JOLU SECURITY"). Claim-free. */
  metaTitle: string
  metaDescription: string
  /** The single H1. */
  h1: string
  /** 45-60 words, plain sentences, no unverified claim. */
  answer: string
  budget: BudgetFactorMatrix
  scope: ServiceScope
  faqs: readonly FaqItem[]
}
