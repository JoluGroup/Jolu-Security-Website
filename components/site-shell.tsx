import type { ReactNode } from "react"
import { MobileActionBar } from "@/components/mobile-action-bar"
import { Navbar } from "@/components/navbar"
import { SiteFooter } from "@/components/site-footer"

/** Shared page chrome: skip link, header, main landmark, footer and mobile quick actions. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">{children}</main>
      <SiteFooter />
      <MobileActionBar />
    </>
  )
}
