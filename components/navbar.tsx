"use client"

import { useEffect, useRef, useState } from "react"
import { Mail, MessageCircle, Phone, X } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { OfficeList } from "@/components/office-list"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { siteConfig, whatsappLink } from "@/lib/site-config"

const SECTION_IDS = ["services", "industries", "about", "why-jolu", "contact"] as const

/** Id of the homepage section currently crossing the upper third of the viewport (null above the first one). */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
          else setActive((prev) => (prev === entry.target.id ? null : prev))
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return active
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const active = useActiveSection()

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <ContactBar />
      <div className="border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-(--nav-h) max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <BrandLogo priority />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {siteConfig.nav.map((item) => {
                const isActive = item.href === `/#${active}`
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={isActive ? "location" : undefined}
                      className="group relative flex h-11 items-center px-3 font-mono text-xs uppercase tracking-[0.18em] text-foreground/75 transition-colors hover:text-foreground aria-[current]:text-foreground"
                    >
                      {item.label}
                      <span
                        className="absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100 group-aria-[current]:scale-x-100 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="hidden h-11 px-5 text-sm sm:inline-flex"
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
                    className="h-11 gap-3 border-input bg-background/40 px-5 font-mono text-xs uppercase tracking-[0.2em] backdrop-blur-sm lg:hidden"
                  />
                }
              >
                Menu
                <span className="flex flex-col gap-1" aria-hidden="true">
                  <span className="block h-px w-4 bg-foreground" />
                  <span className="block h-px w-4 bg-foreground" />
                </span>
              </SheetTrigger>
              <SheetContent
                side="top"
                className="data-[side=top]:h-dvh data-[side=top]:max-h-dvh overflow-y-auto overscroll-contain border-0 bg-background p-0"
                showCloseButton={false}
                initialFocus={closeRef}
              >
                <MenuPanel onNavigate={() => setOpen(false)} closeRef={closeRef} />
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

function MenuPanel({ onNavigate, closeRef }: { onNavigate: () => void; closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const { contact } = siteConfig
  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:px-8">
      <SheetTitle className="sr-only">Site menu</SheetTitle>
      <SheetDescription className="sr-only">Links to each section of the site and ways to contact Jolu Security. Press Escape to close.</SheetDescription>
      <div className="flex h-12 items-center justify-between">
        <BrandLogo />
        <SheetClose
          ref={closeRef}
          className="flex h-11 items-center gap-3 border border-input px-4 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-accent focus-visible:outline-2"
        >
          Close
          <X className="size-4" aria-hidden="true" />
        </SheetClose>
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
                    className="w-6 shrink-0 font-mono text-xs font-normal text-muted-foreground transition-colors group-hover:text-red-400 group-focus-visible:text-red-400"
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
