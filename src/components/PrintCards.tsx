"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import IdCard from "./IdCard"
import type { CardData } from "@/lib/types"

type Layout = "sheet" | "single"
const PER_SHEET = 9 // 3 x 3 on A4

function chunk<T>(list: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const toggleClass = (active: boolean) =>
  `rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none ${
    active ? "border-accent bg-accent/10 text-accent" : "border-slate-300 hover:bg-slate-50"
  }`

export default function PrintCards({ cards, onClose }: { cards: CardData[]; onClose: () => void }) {
  const [layout, setLayout] = useState<Layout>("sheet")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Margin 0 means the browser has no space to print the URL, date or page number
  const pageCss =
    layout === "sheet"
      ? "@page { size: A4 portrait; margin: 0; }"
      : "@page { size: 55mm 87mm; margin: 0; }"

  return createPortal(
    <div
      id="print-root"
      role="dialog"
      aria-modal="true"
      aria-label="Print ID cards"
      className="fixed inset-0 z-50 overflow-auto bg-slate-200 print:static print:inset-auto print:z-auto print:overflow-visible print:bg-white"
    >
      <style>{pageCss}</style>

      <div className="sticky top-0 z-10 border-b border-slate-300 bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Print ID cards</h2>
            <p className="text-sm text-slate-600">
              {cards.length} {cards.length === 1 ? "card" : "cards"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={layout === "sheet"}
              onClick={() => setLayout("sheet")}
              className={toggleClass(layout === "sheet")}
            >
              9 cards per A4 sheet
            </button>
            <button
              type="button"
              aria-pressed={layout === "single"}
              onClick={() => setLayout("single")}
              className={toggleClass(layout === "single")}
            >
              One card per page
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => window.print()}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-accent/25 focus-visible:outline-none"
            >
              Close
            </button>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-5xl text-xs text-slate-500">
          In the print window, choose &ldquo;Save as PDF&rdquo; to download. Keep the scale at 100%.
          If colours are missing, turn on &ldquo;Background graphics&rdquo;. If the web address
          shows on the page, turn off &ldquo;Headers and footers&rdquo;.
        </p>
      </div>

      <div className="p-4 sm:p-6 print:p-0">
        {layout === "sheet" ? (
          chunk(cards, PER_SHEET).map((page, i) => (
            <div
              key={i}
              className="mx-auto mb-6 flex h-[296mm] w-[210mm] items-start justify-center bg-white shadow break-after-page last:break-after-auto print:mb-0 print:shadow-none"
            >
              <div className="grid grid-cols-[repeat(3,54mm)] gap-[3mm]">
                {page.map((card) => (
                  <IdCard key={card.card_id} card={card} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-wrap justify-center gap-4 print:block print:gap-0">
            {cards.map((card) => (
              <div
                key={card.card_id}
                className="flex h-[86.5mm] w-[55mm] items-start justify-center bg-white break-after-page last:break-after-auto"
              >
                <IdCard card={card} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
