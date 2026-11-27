import { AEO_HEADINGS, assessmentNote, purposeHeading, requestLinkText } from "@/lib/seo/aeo-text"
import type { ServiceScope } from "@/lib/seo/aeo-types"

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-pretty leading-relaxed text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function Block({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-foreground">
        {heading}
      </h2>
      {children}
    </section>
  )
}

/**
 * Purpose, buyer requirements, site-assessment process, scope, regulatory considerations and how to request a quotation.
 * The assessment steps are a PROPOSED process and the page says so; nothing here states that an operation, supervisor,
 * licence, certification or response time exists. Regulatory text names laws and regulators as buyer guidance only.
 * Headings avoid claim-sensitive words on purpose (the publication gate forbids claims in headings).
 */
export function ServiceScopeAndCompliance({ scope, serviceName, requestHref }: { scope: ServiceScope; serviceName: string; requestHref: string }) {
  return (
    <div data-aeo="scope-and-compliance" className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 pb-16">
      <Block id="purpose-heading" heading={purposeHeading(serviceName)}>
        <div className="mt-4 flex flex-col gap-4 text-pretty leading-relaxed text-muted-foreground">
          {scope.purpose.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Block>
      <Block id="requirements-heading" heading={AEO_HEADINGS.requirements}>
        <List items={scope.buyerRequirements} />
      </Block>
      <Block id="assessment-heading" heading={AEO_HEADINGS.assessment}>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
          {assessmentNote(serviceName)}
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-pretty leading-relaxed text-muted-foreground">
          {scope.assessmentSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Block>
      <Block id="scope-heading" heading={AEO_HEADINGS.scope}>
        <List items={scope.inScope} />
        <h3 className="mt-6 text-lg font-semibold text-foreground">{AEO_HEADINGS.confirm}</h3>
        <List items={scope.toConfirm} />
      </Block>
      <Block id="regulatory-heading" heading={AEO_HEADINGS.regulatory}>
        <div className="mt-4 flex flex-col gap-4 text-pretty leading-relaxed text-muted-foreground">
          {scope.regulatory.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Block>
      <Block id="request-heading" heading={AEO_HEADINGS.request}>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-pretty leading-relaxed text-muted-foreground">
          {scope.quote.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <p className="mt-4">
          <a href={requestHref} className="text-primary underline underline-offset-4 hover:no-underline">
            {requestLinkText(serviceName)}
          </a>
        </p>
      </Block>
    </div>
  )
}
