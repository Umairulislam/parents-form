"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AREAS, TOWNS, CLASS_LEVELS, BOOK_OPTIONS } from "@/lib/constants"
import type { Submission } from "@/lib/types"

const PAGE_SIZE = 25

type Sort = "newest" | "oldest" | "name"
type Filters = {
  q: string
  town: string
  area: string
  book: string
  level: string
  sort: Sort
}

const defaultFilters: Filters = {
  q: "",
  town: "",
  area: "",
  book: "",
  level: "",
  sort: "newest",
}

const toOptions = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }))

const controlClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/15"

/* ---------- helpers ---------- */

function computeStats(list: Submission[], level: string, today: string) {
  let students = 0
  let exchange = 0
  let given = 0
  let newToday = 0

  for (const r of list) {
    students += level
      ? r.students.filter((s) => s.current_class === level).length
      : r.students.length
    if (r.book_exchange === "exchange") exchange++
    else given++
    if (r.created_day === today) newToday++
  }
  return { parents: list.length, students, exchange, given, newToday }
}

// 0300 1234567 -> https://wa.me/923001234567
function whatsappLink(number: string) {
  let d = number.replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)
  else if (d.startsWith("0")) d = "92" + d.slice(1)
  return `https://wa.me/${d}`
}

// Escapes a CSV cell and blocks spreadsheet formulas (=, @, etc.)
function csvCell(value: string) {
  let v = value ?? ""
  const looksLikeFormula = /^[=+\-@\t\r]/.test(v)
  const isPlainNumber = /^\+?[\d\s-]+$/.test(v)
  if (looksLikeFormula && !isPlainNumber) v = "'" + v
  return `"${v.replace(/"/g, '""')}"`
}

function exportCsv(rows: Submission[]) {
  const header = [
    "Registered",
    "Parent name",
    "Contact number",
    "Home address",
    "Town",
    "Area",
    "Books",
    "Student name",
    "Current class",
    "School / Institute",
  ]
  const lines: string[][] = [header]

  for (const r of rows) {
    const books = BOOK_OPTIONS.find((b) => b.value === r.book_exchange)?.label ?? r.book_exchange
    for (const s of r.students) {
      lines.push([
        r.created_label,
        r.parent_name,
        r.contact_number,
        r.home_address,
        r.town ?? "",
        r.area,
        books,
        s.student_name,
        s.current_class,
        s.school_name,
      ])
    }
  }

  const csv = lines.map((l) => l.map(csvCell).join(",")).join("\r\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------- small components ---------- */

function StatCard({
  label,
  value,
  total,
  showTotal,
}: {
  label: string
  value: number
  total: number
  showTotal: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
        {value.toLocaleString("en-US")}
      </p>
      {showTotal && (
        <p className="mt-0.5 text-sm text-slate-500">of {total.toLocaleString("en-US")}</p>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string
  allLabel: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <select className={controlClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/* ---------- main component ---------- */

export default function AdminDashboard({ rows, today }: { rows: Submission[]; today: string }) {
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [page, setPage] = useState(1)

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const isFiltered = Boolean(
    filters.q || filters.town || filters.area || filters.book || filters.level
  )

  // Build the search text once per row, not on every key press
  const indexed = useMemo(
    () =>
      rows.map((row) => ({
        row,
        text: [
          row.parent_name,
          row.contact_number,
          row.home_address,
          row.town ?? "",
          row.area,
          ...row.students.flatMap((s) => [s.student_name, s.school_name]),
        ]
          .join(" ")
          .toLowerCase(),
        digits: row.contact_number.replace(/\D/g, ""),
      })),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, "")

    const out = indexed
      .filter(({ row, text, digits }) => {
        if (filters.town && row.town !== filters.town) return false
        if (filters.area && row.area !== filters.area) return false
        if (filters.book && row.book_exchange !== filters.book) return false
        if (filters.level && !row.students.some((s) => s.current_class === filters.level))
          return false
        if (q) {
          const byText = text.includes(q)
          // "0300-123" still finds "03001234567"
          const byPhone = qDigits.length >= 3 && digits.includes(qDigits)
          if (!byText && !byPhone) return false
        }
        return true
      })
      .map((x) => x.row)

    out.sort((a, b) => {
      if (filters.sort === "oldest") return a.created_at.localeCompare(b.created_at)
      if (filters.sort === "name") return a.parent_name.localeCompare(b.parent_name)
      return b.created_at.localeCompare(a.created_at)
    })
    return out
  }, [indexed, filters])

  const stats = useMemo(
    () => computeStats(filtered, filters.level, today),
    [filtered, filters.level, today]
  )
  const totals = useMemo(() => computeStats(rows, "", today), [rows, today])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total parents"
          value={stats.parents}
          total={totals.parents}
          showTotal={isFiltered}
        />
        <StatCard
          label="Total students"
          value={stats.students}
          total={totals.students}
          showTotal={isFiltered}
        />
        <StatCard
          label="Books exchange"
          value={stats.exchange}
          total={totals.exchange}
          showTotal={isFiltered}
        />
        <StatCard
          label="Books given"
          value={stats.given}
          total={totals.given}
          showTotal={isFiltered}
        />
        <StatCard
          label="New today"
          value={stats.newToday}
          total={totals.newToday}
          showTotal={isFiltered}
        />
      </section>

      {/* Filters */}
      <section
        aria-label="Search and filters"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="sr-only">Search registrations</span>
          <input
            type="search"
            className={`${controlClass} py-3`}
            placeholder="Search by parent, phone, address, student or school"
            value={filters.q}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect
            label="Town"
            allLabel="All towns"
            value={filters.town}
            options={toOptions(TOWNS)}
            onChange={(v) => update("town", v)}
          />
          <FilterSelect
            label="Area"
            allLabel="All areas"
            value={filters.area}
            options={toOptions(AREAS)}
            onChange={(v) => update("area", v)}
          />
          <FilterSelect
            label="Student's class"
            allLabel="All classes"
            value={filters.level}
            options={toOptions(CLASS_LEVELS)}
            onChange={(v) => update("level", v)}
          />
          <FilterSelect
            label="Books"
            allLabel="All"
            value={filters.book}
            options={BOOK_OPTIONS}
            onChange={(v) => update("book", v)}
          />
          <FilterSelect
            label="Sort by"
            allLabel="Newest first"
            value={filters.sort === "newest" ? "" : filters.sort}
            options={[
              { value: "oldest", label: "Oldest first" },
              { value: "name", label: "Parent name (A to Z)" },
            ]}
            onChange={(v) => update("sort", (v || "newest") as Sort)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600" aria-live="polite">
            {filtered.length === 0
              ? "No matching registrations"
              : `Showing ${start + 1} to ${start + visible.length} of ${filtered.length.toLocaleString("en-US")} ${filtered.length === 1 ? "family" : "families"}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setFilters(defaultFilters)
                  setPage(1)
                }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/5 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => startRefresh(() => router.refresh())}
              disabled={isRefreshing}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => exportCsv(filtered)}
              disabled={filtered.length === 0}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-lg font-bold">
              {rows.length === 0 ? "No registrations yet" : "No registrations match your filters"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {rows.length === 0
                ? "New registrations will appear here."
                : "Try a different search, or clear the filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Parent
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Contact
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Town and area
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Students
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Books
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => (
                  <tr key={r.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{r.parent_name}</p>
                      <p className="mt-0.5 max-w-xs text-slate-500">{r.home_address}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <a
                        href={`tel:${r.contact_number.replace(/[^\d+]/g, "")}`}
                        className="font-medium hover:underline"
                      >
                        {r.contact_number}
                      </a>
                      <a
                        href={whatsappLink(r.contact_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-accent hover:underline"
                      >
                        WhatsApp
                      </a>
                    </td>
                    <td className="px-5 py-4">
                      <p>{r.town || "Not set"}</p>
                      <p className="text-slate-500">{r.area}</p>
                    </td>
                    <td className="px-5 py-4">
                      <ul className="space-y-2">
                        {r.students.map((s) => {
                          const match = filters.level && s.current_class === filters.level
                          return (
                            <li
                              key={s.id}
                              className={match ? "rounded-md bg-pencil/30 px-1.5 py-0.5" : ""}
                            >
                              <span className="font-medium">{s.student_name}</span>
                              <span className="block text-slate-500">
                                {s.current_class}, {s.school_name}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          r.book_exchange === "exchange"
                            ? "bg-accent/10 text-accent"
                            : "bg-pencil/40 text-ink"
                        }`}
                      >
                        {BOOK_OPTIONS.find((b) => b.value === r.book_exchange)?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {r.created_label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm text-slate-600">
              Page {currentPage} of {pageCount}
            </p>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
