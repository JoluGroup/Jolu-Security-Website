"use client"

import { useState } from "react"
import { ArrowUpRight, Phone } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { siteConfig } from "@/lib/site-config"

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-background/90 to-transparent">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:h-20 lg:px-8">
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
            <SheetContent
              side="top"
              className="h-svh border-0 bg-background p-0"
              showCloseButton
            >
              <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-5 pt-5 pb-28 md:pb-10 lg:px-8">
                <SheetTitle className="sr-only">Site menu</SheetTitle>
                <div className="flex h-11 items-center">
                  <BrandLogo />
                </div>
                <nav aria-label="Primary" className="flex flex-1 flex-col justify-center">
                  <ul className="flex flex-col">
                    {siteConfig.nav.map((item, i) => (
                      <li key={item.href} className="border-b border-border">
                        <SheetClose
                          nativeButton={false}
                          render={
                            <a
                              href={item.href}
                              className="group flex items-baseline justify-between gap-4 py-4 text-4xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary md:text-6xl"
                            />
                          }
                        >
                          {item.label}
                          <ArrowUpRight
                            className="size-6 text-muted-foreground transition-colors group-hover:text-primary"
                            aria-hidden="true"
                          />
                          <span className="sr-only">{`(item ${i + 1} of ${siteConfig.nav.length})`}</span>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="flex items-center gap-3 font-mono text-lg text-foreground"
                  >
                    <Phone className="size-5 text-primary" aria-hidden="true" />
                    {siteConfig.contact.phoneDisplay}
                  </a>
                  <Button
                    size="sm"
                    className="h-10 self-start px-5 sm:self-auto"
                    nativeButton={false}
                    render={<a href={siteConfig.quoteHref} onClick={() => setOpen(false)} />}
                  >
                    Request a Quote
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
