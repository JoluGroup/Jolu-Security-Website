import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, Download, Mail, MessageCircle, Phone } from "lucide-react"
import { EnquiryForm } from "@/components/enquiry-form"
import { FadeUp } from "@/components/motion-frames"
import { OfficeList } from "@/components/office-list"
import { getApprovedOffices } from "@/lib/offices"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { clearedDocuments } from "@/lib/document-library"
import { siteConfig, whatsappLink } from "@/lib/site-config"

export function ContactSection() {
  const { contact } = siteConfig
  const downloads = clearedDocuments()

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="scroll-mt-(--header-h) border-t border-border bg-card"
    >
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 md:grid-cols-12 md:gap-8 md:py-32 lg:px-8">
        <div className="flex flex-col gap-10 md:col-span-5">
          <FadeUp className="flex flex-col gap-6">
            <Eyebrow>Contact</Eyebrow>
            <SectionTitle id="contact-title">Talk to us</SectionTitle>
            <p className="max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
              Call, message or write to us about the site, event or person you need to protect.
            </p>
          </FadeUp>

          <ul className="flex flex-col border-t border-border" aria-label="Ways to reach us">
            <ContactAction
              icon={MessageCircle}
              label="WhatsApp"
              value="Message us on WhatsApp"
              href={whatsappLink(contact.whatsappGreeting)}
              external
              primary
            />
            {contact.phones.map((phone) => (
              <ContactAction
                key={phone.e164}
                icon={Phone}
                label="Call"
                value={phone.displayIntl}
                href={phone.href}
                mono
              />
            ))}
            <ContactAction icon={Mail} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
          </ul>

          {getApprovedOffices().length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Offices</h3>
              <OfficeList />
            </div>
          )}

          {downloads.length > 0 ? (
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Downloads</h3>
              <ul className="flex flex-wrap gap-3">
                {downloads.map((file) => (
                  <li key={file.href}>
                    <a
                      href={file.href}
                      download
                      className="flex min-h-11 items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      {file.label} (PDF)
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <div className="relative border border-border bg-background p-5 sm:p-8">
            <span className="absolute -top-px left-0 h-px w-16 bg-primary" aria-hidden="true" />
            <EnquiryForm />
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactAction({
  icon: Icon,
  label,
  value,
  href,
  external = false,
  primary = false,
  mono = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  href: string
  external?: boolean
  primary?: boolean
  mono?: boolean
}) {
  return (
    <li className="border-b border-border">
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group flex min-h-16 items-center gap-4 py-3 transition-colors hover:bg-accent/40 sm:px-2"
      >
        <span
          className={
            primary
              ? "flex size-11 shrink-0 items-center justify-center bg-primary text-primary-foreground"
              : "flex size-11 shrink-0 items-center justify-center border border-border text-foreground transition-colors group-hover:border-primary"
          }
          aria-hidden="true"
        >
          <Icon className="size-5" strokeWidth={1.5} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
          <span className={mono ? "font-mono text-lg text-foreground" : "break-words text-lg text-foreground"}>
            {value}
          </span>
        </span>
        <ArrowUpRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground motion-reduce:transition-none"
          aria-hidden="true"
        />
        {external && <span className="sr-only">(opens in a new tab)</span>}
      </a>
    </li>
  )
}
