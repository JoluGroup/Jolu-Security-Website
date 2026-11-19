import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { rootMetadata } from "@/lib/seo/metadata"
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

// Site-wide defaults live in lib/seo/metadata.ts; each page sets its own canonical, Open Graph and Twitter metadata.
export const metadata: Metadata = rootMetadata

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
