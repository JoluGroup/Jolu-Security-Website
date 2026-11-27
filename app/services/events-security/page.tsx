import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublishedPage } from "@/components/pages/published-page"
import { gatedPageMetadata } from "@/lib/seo/page-metadata"
import { getPublishedPage } from "@/lib/seo/publication-gate"

export function generateMetadata(): Metadata {
  const page = getPublishedPage("service", "events-security")
  if (!page) notFound()
  return gatedPageMetadata(page) ?? notFound()
}

export default function Page() {
  return <PublishedPage kind="service" slug="events-security" />
}
