import { MessageCircle, Phone } from "lucide-react"
import { siteConfig } from "@/lib/site-config"

export function MobileActionBar() {
  return (
    <nav
      aria-label="Quick contact"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-2 gap-3">
        <li>
          <a
            href={siteConfig.contact.phoneHref}
            className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground"
          >
            <Phone className="size-4" aria-hidden="true" />
            Call
          </a>
        </li>
        <li>
          <a
            href={siteConfig.contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-md border border-input text-sm font-medium text-foreground"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      </ul>
    </nav>
  )
}
