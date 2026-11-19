import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // print:hidden hides the dashboard when printing the ID cards
  return <div className="print:hidden">{children}</div>
}
