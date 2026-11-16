import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
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
  title: "Jolu Group Security | Layers of Protection",
  description:
    "Electric fencing, manned guarding, CCTV, alarm response, K9 and VIP close protection across Kenya. Confidence in every layer of protection.",
  keywords: [
    "security services Kenya",
    "manned guarding",
    "K9 unit",
    "CCTV installation",
    "electric fencing",
    "VIP close protection",
  ],
  openGraph: {
    title: "Jolu Group Security",
    description:
      "Manned guarding, K9, CCTV, electric fencing and VIP close protection across Kenya.",
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
