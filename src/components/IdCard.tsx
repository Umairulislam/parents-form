import { QRCodeSVG } from "qrcode.react"
import type { CardData } from "@/lib/types"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[5.5pt] leading-tight text-slate-500">{label}</p>
      <p className="line-clamp-2 text-[7.5pt] leading-tight font-semibold text-ink">{value}</p>
    </div>
  )
}

export default function IdCard({ card }: { card: CardData }) {
  const location = [card.town, card.area].filter(Boolean).join(", ")

  return (
    <div className="id-card flex h-[86mm] w-[54mm] flex-col overflow-hidden rounded-[3mm] border border-slate-300 bg-white">
      <div className="flex h-[16mm] shrink-0 items-center justify-center bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-[11mm] w-[11mm] rounded-[2mm] bg-white" />
      </div>

      <div className="flex flex-1 flex-col justify-between px-[4mm] py-[3mm]">
        <div>
          <p className="line-clamp-2 font-display text-[10pt] leading-tight font-extrabold text-ink">
            {card.student_name}
          </p>
          <p className="mt-[0.6mm] text-[7.5pt] font-semibold text-accent">{card.current_class}</p>
        </div>

        <div className="space-y-[1.6mm] border-t border-slate-200 pt-[2mm]">
          <Row label="Parent" value={card.parent_name} />
          <Row label="Contact" value={card.contact_number} />
          <Row label="Town and area" value={location} />
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-white p-[0.8mm]">
            <QRCodeSVG value={card.card_id} size={64} level="M" className="h-[16mm] w-[16mm]" />
          </div>
          <p className="mt-[0.8mm] font-mono text-[7pt] font-bold tracking-wider text-ink">
            {card.card_id}
          </p>
        </div>
      </div>
    </div>
  )
}
