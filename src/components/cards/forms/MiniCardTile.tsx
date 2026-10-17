import type { CardColor } from "@/lib/sheets/types";
import { optionLabel } from "@/lib/format/labels";
import { cardGradient } from "../CardTile";

/** The chosen card at the top of the Add statement and Mark paid previews: issuer, name, •••• last 4 and the statement's dates. */
export function MiniCardTile({ card, dates }: { card?: { name: string; issuer: string; color?: CardColor; last4?: string }; dates?: string }) {
  return (
    <div
      className="flex h-[104px] flex-col justify-between rounded-[18px] border border-on-card-line p-4 text-on-card shadow-tile max-md:h-auto max-md:gap-2 max-md:p-3"
      style={{ background: card ? cardGradient(card.color) : "var(--fill-strong)" }}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between">
        <span className="h-3.5 w-5 rounded-[3px]" style={{ background: "var(--card-chip)" }} />
        <span className="text-[10px] font-semibold text-on-card-faint">{card ? optionLabel(card.issuer) : "Choose a card"}</span>
      </div>
      <div>
        <div className="truncate text-sm font-extrabold">{card?.name ?? "No card chosen"}</div>
        <div className="mt-1 flex justify-between text-[11px] text-on-card-faint tabular-nums">
          <span className="tracking-[0.14em]">{card?.last4 ? `•••• ${card.last4}` : "••••"}</span>
          <span>{dates}</span>
        </div>
      </div>
    </div>
  );
}

/** One line of a preview's summary box. */
export function SummaryRow({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-muted">{label}</span>
      <span className={`text-right tabular-nums ${strong ? "font-extrabold" : "font-bold"}`}>{children}</span>
    </div>
  );
}
