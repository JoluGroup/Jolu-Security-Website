import { cacheLife } from "next/cache"
import { BrandLogo } from "@/components/brand-logo"
import { OfficeList } from "@/components/office-list"
import { INDUSTRIES, SERVICES } from "@/lib/services"
import { siteConfig } from "@/lib/site-config"

async function CurrentYear() {
  "use cache"
  cacheLife("days")
  return <>{new Date().getFullYear()}</>
}

export function SiteFooter() {
  const { contact } = siteConfig
  return (
    <footer className="border-t border-border pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-12 md:gap-8 lg:px-8">
        <div className="flex flex-col gap-4 md:col-span-4">
          <BrandLogo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{siteConfig.description}</p>
        </div>
        <FooterList title="Services" className="md:col-span-2">
          {SERVICES.map((s) => (
            <li key={s.id}>
              <a href={`/?service=${s.id}#contact`} className="hover:text-foreground">
                {s.name}
              </a>
            </li>
          ))}
        </FooterList>
        <FooterList title="Industries" className="md:col-span-2">
          {INDUSTRIES.map((i) => (
            <li key={i.id}>{i.name}</li>
          ))}
        </FooterList>
        <FooterList title="Contact" className="md:col-span-2">
          {contact.phones.map((phone) => (
            <li key={phone.e164}>
              <a href={phone.href} className="font-mono hover:text-foreground">
                {phone.displayIntl}
              </a>
            </li>
          ))}
          <li>
            <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              WhatsApp<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={`mailto:${contact.email}`} className="break-all hover:text-foreground">
              {contact.email}
            </a>
          </li>
        </FooterList>
        <section aria-labelledby="footer-offices-title" className="md:col-span-6 lg:col-span-2">
          <h2 id="footer-offices-title" className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Offices
          </h2>
          <OfficeList compact className="mt-4" />
        </section>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-5 py-6 font-mono text-xs text-muted-foreground lg:px-8">
          © <CurrentYear /> {siteConfig.name}
        </p>
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
