import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"
import { Eyebrow, SectionTitle } from "@/components/section-heading"
import { SiteShell } from "@/components/site-shell"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/seo/metadata"
import { siteConfig } from "@/lib/site-config"

// noindex placeholder: see LIVE_PAGES in lib/seo/pages.ts. Flip `indexable` there (and add articles) to publish.
export const metadata: Metadata = pageMetadata("/blog")

export default function BlogPage() {
  return (
    <SiteShell>
      <section aria-labelledby="blog-title" className="border-b border-border">
        <div className="mx-auto flex min-h-[70svh] max-w-7xl flex-col justify-center gap-10 px-5 pt-[calc(var(--header-h)+4rem)] pb-24 md:pb-32 lg:px-8">
          <div className="flex max-w-3xl flex-col gap-6">
            <Eyebrow>Blog</Eyebrow>
            <SectionTitle as="h1" id="blog-title">Articles are on the way</SectionTitle>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Articles about security for homes, estates, businesses and events will be published here.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<a href={siteConfig.quoteHref} />}>
              Request a Quote
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              nativeButton={false}
              render={<a href={siteConfig.servicesHref} />}
            >
              Explore services
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
