import { Download, Mail, MessageCircle, Phone } from "lucide-react"
import { EnquiryForm } from "@/components/enquiry-form"
import { OfficeList } from "@/components/office-list"
import { getApprovedOffices } from "@/lib/offices"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { Button } from "@/components/ui/button"
import { clearedDocuments } from "@/lib/document-library"
import { siteConfig, whatsappLink } from "@/lib/site-config"

export function ContactSection() {
  const { contact } = siteConfig
  const downloads = clearedDocuments()

  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-(--header-h) border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 py-24 md:grid-cols-12 md:gap-8 md:py-32 lg:px-8">
        <div className="flex flex-col gap-10 md:col-span-5">
          <div className="flex flex-col gap-6">
            <Eyebrow>Contact</Eyebrow>
            <SectionTitle id="contact-title">Talk to us</SectionTitle>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="h-12 w-full px-6 text-base sm:w-fit" nativeButton={false} render={<a href={whatsappLink(contact.whatsappGreeting)} target="_blank" rel="noopener noreferrer" />}>
              <MessageCircle aria-hidden="true" />
              Message us on WhatsApp
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          </div>

          <dl className="flex flex-col">
            <ContactRow label="Phone" icon={<Phone className="size-4" aria-hidden="true" />}>
              <ul className="flex flex-col gap-1">
                {contact.phones.map((phone) => (
                  <li key={phone.e164}>
                    <a href={phone.href} className="font-mono text-lg text-foreground underline-offset-4 hover:underline">
                      {phone.displayIntl}
                    </a>
                  </li>
                ))}
              </ul>
            </ContactRow>
            <ContactRow label="Email" icon={<Mail className="size-4" aria-hidden="true" />}>
              <a href={`mailto:${contact.email}`} className="text-lg text-foreground underline-offset-4 hover:underline">
                {contact.email}
              </a>
            </ContactRow>
          </dl>

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
                    className="flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm text-foreground hover:bg-accent"
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
          <EnquiryForm />
        </div>
      </div>
    </section>
  )
}

function ContactRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-4 last:border-b">
      <dt className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}
