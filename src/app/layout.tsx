import type { Metadata } from "next"
import { Bricolage_Grotesque, Figtree } from "next/font/google"
import "./globals.css"

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
})

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
})

export const metadata: Metadata = {
  title: "Book exchange registration",
  description: "Register your family for the school book exchange.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
