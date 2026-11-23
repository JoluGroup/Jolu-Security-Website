import Link from "next/link"
import { publishedPagePaths } from "@/lib/seo/publication-gate"

export type InternalLink = { href: string; label: string }

/** Keeps a link only if it points at the homepage (or one of its anchors) or at a page that passed the gate. Unpublished targets are dropped. */
export function allowedLinks(links: readonly InternalLink[], published: readonly string[] = publishedPagePaths()): InternalLink[] {
  return links.filter((l) => l.href === "/" || l.href.startsWith("/#") || published.includes(l.href))
}

export function InternalLinks({ links, heading = "Related" }: { links: readonly InternalLink[]; heading?: string }) {
  const shown = allowedLinks(links)
  if (shown.length === 0) return null
  return (
    <nav aria-label={heading} className="mx-auto w-full max-w-6xl px-6 pb-16">
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {shown.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-primary underline-offset-4 hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
