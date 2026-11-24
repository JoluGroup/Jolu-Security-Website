import { cacheLife } from "next/cache"
import { ArrowUp } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { OfficeList } from "@/components/office-list"
import { getApprovedOffices } from "@/lib/offices"
import { INDUSTRIES, SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

async function CurrentYear() {
  "use cache"
  cacheLife("days")
  return <>{new Date().getFullYear()}</>
}

export function SiteFooter() {
  const { contact } = siteConfig
  const hasOffices = getApprovedOffices().length > 0
  return (
    <footer className="border-t border-border pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 md:grid-cols-12 md:gap-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:col-span-2 md:col-span-3">
          <BrandLogo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{siteConfig.description}</p>
        </div>
        <FooterList title="Services" className="md:col-span-3 lg:col-span-2">
          {SERVICES.map((s) => (
            <li key={s.id}>
              <a href={`/?service=${s.id}#contact`} className="inline-flex min-h-11 items-center md:min-h-8 hover:text-foreground">
                {s.name}
              </a>
            </li>
          ))}
        </FooterList>
        <FooterList title="Industries" className="md:col-span-3 lg:col-span-2">
          {INDUSTRIES.map((i) => (
            <li key={i.id} className="inline-flex min-h-11 items-center md:min-h-8">
              {i.name}
            </li>
          ))}
        </FooterList>
        <FooterList title="Company" className="md:col-span-3 lg:col-span-2">
          {siteConfig.nav
            .filter((item) => item.label !== "Services" && item.label !== "Industries")
            .map((item) => (
              <li key={item.href}>
                <a href={item.href} className="inline-flex min-h-11 items-center md:min-h-8 hover:text-foreground">
                  {item.label}
                </a>
              </li>
            ))}
        </FooterList>
        <FooterList title="Contact" className="md:col-span-3 lg:col-span-3">
          {contact.phones.map((phone) => (
            <li key={phone.e164}>
              <a href={phone.href} className="inline-flex min-h-11 items-center md:min-h-8 font-mono hover:text-foreground">
                {phone.displayIntl}
              </a>
            </li>
          ))}
          <li>
            <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center md:min-h-8 hover:text-foreground">
              WhatsApp<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={`mailto:${contact.email}`} className="inline-flex min-h-11 items-center md:min-h-8 break-all hover:text-foreground">
              {contact.email}
            </a>
          </li>
        </FooterList>
        {hasOffices && (
          <section aria-labelledby="footer-offices-title" className="md:col-span-6 lg:col-span-2">
            <h2 id="footer-offices-title" className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Offices
            </h2>
            <OfficeList compact className="mt-4" />
          </section>
        )}
      </div>
      <div className="relative hidden overflow-hidden border-t border-border md:block" aria-hidden="true">
        <p className="hero-outline select-none px-5 text-center font-semibold leading-[0.8] tracking-tighter whitespace-nowrap [font-size:clamp(3.5rem,13.5vw,12rem)] lg:px-8">
          JOLU SECURITY
        </p>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 font-mono text-xs text-muted-foreground lg:px-8">
          <p>
            © <CurrentYear /> {siteConfig.name}
          </p>
          <a href="#main" className="group flex min-h-11 items-center gap-2 uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground">
            Back to top
            <ArrowUp className="size-3.5 transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}

function FooterList({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <nav aria-label={`Footer ${title.toLowerCase()}`} className={className}>
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-foreground/80">{children}</ul>
    </nav>
  )
}
