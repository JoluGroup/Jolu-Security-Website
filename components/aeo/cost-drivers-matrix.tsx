import { AEO_HEADINGS, AEO_TABLE_HEADERS } from "@/lib/seo/aeo-text"
import type { BudgetFactorMatrix } from "@/lib/seo/aeo-types"

/**
 * Budget-factor matrix: an accessible table comparing two HYPOTHETICAL scenarios factor by factor. It shows what moves
 * a budget, never an amount: cells are words, there is no currency or number anywhere, and the intro and note say the
 * scenarios are invented and that the real figure comes from a written quotation after a site assessment.
 * Semantic table (caption, column headers, row headers) inside a keyboard-scrollable region for small screens.
 */
export function CostDriversMatrix({ matrix, heading = AEO_HEADINGS.budget }: { matrix: BudgetFactorMatrix; heading?: string }) {
  return (
    <section aria-labelledby="budget-factors-heading" data-aeo="cost-drivers" className="mx-auto w-full max-w-5xl px-6 pb-16">
      <h2 id="budget-factors-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        {heading}
      </h2>
      <p className="mt-4 max-w-3xl text-pretty leading-relaxed text-muted-foreground">{matrix.intro}</p>
      <div
        role="region"
        aria-labelledby="budget-factors-caption"
        tabIndex={0}
        className="mt-6 overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption id="budget-factors-caption" className="px-4 py-3 text-left text-sm text-muted-foreground">
            {matrix.caption}
          </caption>
          <thead>
            <tr className="border-y border-border text-foreground">
              <th scope="col" className="px-4 py-3 font-semibold">
                {AEO_TABLE_HEADERS.factor}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {AEO_TABLE_HEADERS.why}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {matrix.scenarioA.label}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {matrix.scenarioB.label}
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.factor} className="border-b border-border align-top last:border-b-0">
                <th scope="row" className="px-4 py-3 font-medium text-foreground">
                  {row.factor}
                </th>
                <td className="px-4 py-3 text-muted-foreground">{row.whyItMatters}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.scenarioA}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.scenarioB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-6 grid max-w-3xl gap-3 text-sm text-muted-foreground">
        <div>
          <dt className="inline font-medium text-foreground">{matrix.scenarioA.label}. </dt>
          <dd className="inline">{matrix.scenarioA.description}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-foreground">{matrix.scenarioB.label}. </dt>
          <dd className="inline">{matrix.scenarioB.description}</dd>
        </div>
      </dl>
      <p className="mt-4 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">{matrix.note}</p>
    </section>
  )
}
