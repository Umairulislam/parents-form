"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ZILAS, ALL_TOWNS, townsForZila, CLASS_LEVELS, BOOK_OPTIONS } from "@/lib/constants"
import { formatCardId, MAX_CARDS_PER_PRINT } from "@/lib/card"
import type { CardData, Student, Submission } from "@/lib/types"
import PrintCards from "./PrintCards"

const PAGE_SIZE = 25

type Sort = "newest" | "oldest" | "name"
type Filters = {
  q: string
  town: string
  zila: string
  book: string
  level: string
  sort: Sort
}

const defaultFilters: Filters = {
  q: "",
  town: "",
  zila: "",
  book: "",
  level: "",
  sort: "newest",
}

const toOptions = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }))

const controlClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/15"

const secondaryButton =
  "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none disabled:opacity-50"

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

function cardFor(r: Submission, s: Student): CardData {
  return {
    card_id: formatCardId(s.card_number),
    student_name: s.student_name,
    current_class: s.current_class,
    parent_name: r.parent_name,
    contact_number: r.contact_number,
    town: r.town ?? "",
    zila: r.zila,
  }
}

// One card for each student. If a class filter is on, only that class.
function buildCards(list: Submission[], level: string): CardData[] {
  return list.flatMap((r) =>
    r.students.filter((s) => !level || s.current_class === level).map((s) => cardFor(r, s))
  )
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
    "Zila",
    "Town / Cant",
    "Books",
    "Card ID",
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
        r.zila,
        r.town ?? "",
        books,
        formatCardId(s.card_number),
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [printCards, setPrintCards] = useState<CardData[] | null>(null)
  const [printNotice, setPrintNotice] = useState("")

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  function changeZila(value: string) {
    setFilters((f) => ({ ...f, zila: value, town: "" }))
    setPage(1)
  }

  const isFiltered = Boolean(
    filters.q || filters.town || filters.zila || filters.book || filters.level
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
          row.zila,
          ...row.students.flatMap((s) => [
            s.student_name,
            s.school_name,
            formatCardId(s.card_number),
          ]),
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
        if (filters.zila && row.zila !== filters.zila) return false
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

  /* ----- printing ----- */

  const allCards = useMemo(() => buildCards(filtered, filters.level), [filtered, filters.level])
  const selectedRows = useMemo(
    () => filtered.filter((r) => selected.has(r.id)),
    [filtered, selected]
  )
  const selectedCards = useMemo(
    () => buildCards(selectedRows, filters.level),
    [selectedRows, filters.level]
  )

  function openPrint(cards: CardData[]) {
    if (cards.length === 0) return
    if (cards.length > MAX_CARDS_PER_PRINT) {
      setPrintNotice(
        `That is ${cards.length} cards. Please print up to ${MAX_CARDS_PER_PRINT} at a time. Use the filters, or select fewer parents.`
      )
      return
    }
    setPrintNotice("")
    setPrintCards(cards)
  }

  const allOnPageSelected = visible.length > 0 && visible.every((r) => selected.has(r.id))

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) visible.forEach((r) => next.delete(r.id))
      else visible.forEach((r) => next.add(r.id))
      return next
    })
  }

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
            placeholder="Search by parent, phone, address, student, school or card ID"
            value={filters.q}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect
            label="Zila"
            allLabel="All zilas"
            value={filters.zila}
            options={toOptions(ZILAS)}
            onChange={changeZila}
          />
          <FilterSelect
            label="Town / Cant"
            allLabel="All towns / cants"
            value={filters.town}
            options={toOptions(filters.zila ? townsForZila(filters.zila) : ALL_TOWNS)}
            onChange={(v) => update("town", v)}
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
              className={secondaryButton}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => openPrint(allCards)}
              disabled={allCards.length === 0}
              className={secondaryButton}
            >
              Print all ({allCards.length} {allCards.length === 1 ? "card" : "cards"})
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

        {printNotice && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {printNotice}
          </p>
        )}
      </section>

      {/* Selection bar */}
      {selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-5 py-3">
          <p className="text-sm font-semibold">
            {selectedRows.length} {selectedRows.length === 1 ? "parent" : "parents"} selected (
            {selectedCards.length} {selectedCards.length === 1 ? "card" : "cards"})
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className={secondaryButton}
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => openPrint(selectedCards)}
              disabled={selectedCards.length === 0}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none disabled:opacity-50"
            >
              Print selected cards
            </button>
          </div>
        </div>
      )}

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
            <table className="w-full min-w-[62rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="w-12 px-5 py-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-accent"
                      aria-label="Select all families on this page"
                      checked={allOnPageSelected}
                      onChange={togglePage}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Parent
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Contact
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Zila and town / cant
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
                {visible.map((r) => {
                  const isSelected = selected.has(r.id)
                  return (
                    <tr
                      key={r.id}
                      className={`align-top transition hover:bg-slate-50/70 ${isSelected ? "bg-accent/5" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          className="size-4 accent-accent"
                          aria-label={`Select ${r.parent_name}`}
                          checked={isSelected}
                          onChange={() => toggleRow(r.id)}
                        />
                      </td>
                      <td className="px-3 py-4">
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
                        <p>{r.zila}</p>
                        <p className="text-slate-500">{r.town || "Not set"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ul className="space-y-2">
                          {r.students.map((s) => {
                            const match = filters.level && s.current_class === filters.level
                            return (
                              <li
                                key={s.id}
                                className={`flex items-start justify-between gap-4 ${match ? "rounded-md bg-pencil/30 px-1.5 py-0.5" : ""}`}
                              >
                                <div>
                                  <span className="font-medium">{s.student_name}</span>
                                  <span className="block text-slate-500">
                                    {s.current_class}, {s.school_name}
                                  </span>
                                  <span className="block font-mono text-xs text-slate-400">
                                    {formatCardId(s.card_number)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openPrint([cardFor(r, s)])}
                                  aria-label={`Print card for ${s.student_name}`}
                                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent/10 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none"
                                >
                                  Print card
                                </button>
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
                  )
                })}
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

      {printCards && <PrintCards cards={printCards} onClose={() => setPrintCards(null)} />}
    </div>
  )
}
