import Link from "next/link"

export type Crumb = { name: string; href: string }

/** Visible breadcrumb trail. Must list the same items, in the same order, as the BreadcrumbList structured data. */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" data-aeo="breadcrumbs" className="mb-8 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={item.href} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="underline-offset-4 hover:text-foreground hover:underline">
                  {item.name}
                </Link>
              )}
              {last ? null : <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
