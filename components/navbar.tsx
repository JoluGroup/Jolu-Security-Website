"use client"

import { useState } from "react"
import { Mail, MessageCircle, Phone } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { OfficeList } from "@/components/office-list"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { siteConfig, whatsappLink } from "@/lib/site-config"

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <ContactBar />
      <div className="bg-gradient-to-b from-background/90 to-transparent">
        <div className="mx-auto flex h-(--nav-h) max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="hidden h-9 px-4 sm:inline-flex"
              nativeButton={false}
              render={<a href={siteConfig.quoteHref} />}
            >
              Request a Quote
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-3 border-input bg-background/40 px-4 font-mono text-xs uppercase tracking-[0.2em] backdrop-blur-sm"
                  />
                }
              >
                Menu
                <span className="flex flex-col gap-1" aria-hidden="true">
                  <span className="block h-px w-4 bg-foreground" />
                  <span className="block h-px w-4 bg-foreground" />
                </span>
              </SheetTrigger>
              <SheetContent side="top" className="h-svh overflow-y-auto border-0 bg-background p-0" showCloseButton>
                <MenuPanel onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}

function ContactBar() {
  const { phones, email } = siteConfig.contact
  return (
    <div className="h-(--contact-bar-h) border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-5 font-mono text-xs lg:px-8">
        <ul className="flex h-full items-center gap-4 md:gap-6">
          {phones.map((phone, i) => (
            <li key={phone.e164} className="flex h-full items-center">
              <a
                href={phone.href}
                className="flex h-full items-center gap-2 whitespace-nowrap text-foreground/80 transition-colors hover:text-foreground"
              >
                {i === 0 && <span className="h-px w-3 bg-primary" aria-hidden="true" />}
                <span className="sr-only">Call </span>
                {phone.display}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={`mailto:${email}`}
          className="hidden h-full items-center gap-2 text-foreground/80 transition-colors hover:text-foreground md:flex"
        >
          <Mail className="size-3.5" aria-hidden="true" />
          {email}
        </a>
      </div>
    </div>
  )
}

function MenuPanel({ onNavigate }: { onNavigate: () => void }) {
  const { contact } = siteConfig
  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 pt-5 pb-28 md:pb-10 lg:px-8">
      <SheetTitle className="sr-only">Site menu</SheetTitle>
      <div className="flex h-11 items-center">
        <BrandLogo />
      </div>

      <div className="grid flex-1 content-center gap-12 py-10 lg:grid-cols-12 lg:items-center lg:gap-8">
        <nav aria-label="Primary" className="lg:col-span-7">
          <ul className="flex flex-col border-t border-border [&:hover_a:not(:hover)]:opacity-60">
            {siteConfig.nav.map((item, i) => (
              <li key={item.href} className="border-b border-border">
                <SheetClose
                  nativeButton={false}
                  render={
                    <a
                      href={item.href}
                      className="group relative flex min-h-12 items-baseline gap-5 py-3 text-2xl font-semibold tracking-tight text-foreground transition-opacity duration-300 motion-reduce:transition-none lg:py-5 lg:text-4xl"
                    />
                  }
                >
                  <span
                    className="w-6 shrink-0 font-mono text-xs font-normal text-muted-foreground transition-colors group-hover:text-primary group-focus-visible:text-primary"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.label}
                  <span
                    className="absolute -bottom-px left-0 h-px w-0 bg-primary transition-[width] duration-500 ease-out group-hover:w-full group-focus-visible:w-full motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="menu-contact-title" className="flex flex-col gap-6 lg:col-span-4 lg:col-start-9">
          <h2 id="menu-contact-title" className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Get in touch
          </h2>
          <ul className="flex flex-col gap-1">
            {contact.phones.map((phone) => (
              <li key={phone.e164}>
                <a href={phone.href} className="flex min-h-11 items-center gap-3 font-mono text-base text-foreground">
                  <Phone className="size-4 text-primary" aria-hidden="true" />
                  {phone.displayIntl}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${contact.email}`} className="flex min-h-11 items-center gap-3 text-base text-foreground">
                <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                {contact.email}
              </a>
            </li>
            <li>
              <a
                href={whatsappLink(contact.whatsappGreeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 text-base text-foreground"
              >
                <MessageCircle className="size-4 text-muted-foreground" aria-hidden="true" />
                WhatsApp
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
          <OfficeList compact />
          <Button
            size="lg"
            className="h-12 w-full px-6 text-base lg:w-fit"
            nativeButton={false}
            render={<a href={siteConfig.quoteHref} onClick={onNavigate} />}
          >
            Request a Quote
          </Button>
        </section>
      </div>
    </div>
  )
}
