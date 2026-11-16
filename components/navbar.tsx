"use client"

import { useState } from "react"
import { Menu, Phone } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { siteConfig } from "@/lib/site-config"

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">
        <BrandLogo />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <a
            href={siteConfig.contact.phoneHref}
            className="flex items-center gap-2 rounded-md font-mono text-sm text-foreground transition-colors hover:text-muted-foreground"
          >
            <Phone className="size-4" aria-hidden="true" />
            {siteConfig.contact.phoneDisplay}
          </a>
          <a
            href={siteConfig.assessmentHref}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Request Assessment
          </a>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs border-border bg-card p-0">
            <SheetTitle className="px-6 pt-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Menu
            </SheetTitle>
            <nav aria-label="Mobile" className="px-3">
              <ul className="flex flex-col">
                {siteConfig.nav.map((item) => (
                  <li key={item.href}>
                    <SheetClose
                      render={<a href={item.href} />}
                      className="block rounded-md px-3 py-3 text-lg text-foreground transition-colors hover:bg-accent"
                    >
                      {item.label}
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-border p-6">
              <a
                href={siteConfig.contact.phoneHref}
                className="flex items-center gap-2 font-mono text-sm text-foreground"
              >
                <Phone className="size-4" aria-hidden="true" />
                {siteConfig.contact.phoneDisplay}
              </a>
              <SheetClose
                render={<a href={siteConfig.assessmentHref} />}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Request Assessment
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
