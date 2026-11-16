import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { siteConfig } from "@/lib/site-config"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.name,
  description:
    "Security services across Kenya: manned guarding, events security, K9 unit, CCTV installation, electric fencing, alarm response and VIP close protection.",
  alternates: { canonical: "/" },
  keywords: [
    "security services Kenya",
    "manned guarding",
    "K9 unit",
    "CCTV installation",
    "electric fencing",
    "VIP close protection",
  ],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    images: [{ url: siteConfig.logo.src, alt: siteConfig.logo.alt }],
    type: "website",
    locale: "en_KE",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} dark bg-background antialiased`}
    >
      <body className="min-h-svh">{children}</body>
    </html>
  )
}
