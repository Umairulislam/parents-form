import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { logout } from "@/lib/auth-actions"
import AdminDashboard from "@/components/AdminDashboard"
import type { Submission } from "@/lib/types"

const TZ = "Asia/Karachi"

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }) // 2026-11-17
const labelFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

type RawRow = Omit<Submission, "created_label" | "created_day">

async function loadSubmissions(supabase: Awaited<ReturnType<typeof createClient>>) {
  const rows: RawRow[] = []
  const size = 1000 // Supabase returns at most 1000 rows per request

  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "id, parent_name, contact_number, home_address, town, area, book_exchange, created_at, students(id, student_name, current_class, school_name)"
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + size - 1)

    if (error) return { error: error.message, rows: [] as Submission[] }

    const batch = (data ?? []) as unknown as RawRow[]
    rows.push(...batch)
    if (batch.length < size) break
  }

  const mapped: Submission[] = rows.map((r) => {
    const date = new Date(r.created_at)
    return {
      ...r,
      created_label: labelFormat.format(date),
      created_day: dayFormat.format(date),
    }
  })

  return { error: null, rows: mapped }
}

export default async function AdminPage() {
  const supabase = await createClient()

  // Check again here. Do not trust the proxy alone.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/admin/login")

  const { rows, error } = await loadSubmissions(supabase)
  const today = dayFormat.format(new Date())

  return (
    <main className="min-h-screen pb-16">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-8 pb-14 sm:px-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Registrations</h1>
            <p className="mt-1 text-sm text-slate-300">Signed in as {user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-xl border border-white/30 px-4 py-2.5 font-semibold transition hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white/30 focus-visible:outline-none"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            Could not load the registrations: {error}
          </p>
        ) : (
          <AdminDashboard rows={rows} today={today} />
        )}
      </div>
    </main>
  )
}
