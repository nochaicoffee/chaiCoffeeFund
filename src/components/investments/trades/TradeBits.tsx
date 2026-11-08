import type { TradeKind } from "@/lib/aggregate/tradeHistory";
import { PLAN_STYLE } from "../PlanTag";

/** Bits the Trades page's list and book share: a trade's kind badge and a holding's tile (design: bsb, symt). */
const KIND_STYLE: Record<TradeKind, { className?: string; style?: { background: string; color: string } }> = {
  buy: { className: "bg-accent-tint text-positive" },
  sell: { className: "bg-negative-tint text-negative" },
  rsu: { style: PLAN_STYLE.RSU },
  espp: { style: PLAN_STYLE.ESPP },
};

export function KindBadge({ kind, label }: { kind: TradeKind; label: string }) {
  const s = KIND_STYLE[kind];
  return (
    <span className={`inline-flex rounded-[6px] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.05em] whitespace-nowrap uppercase ${s.className ?? ""}`} style={s.style}>
      {label}
    </span>
  );
}

export function HoldingTile({ tile, colorKey, size = 32 }: { tile: string; colorKey: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center font-extrabold text-on-card"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * (tile.length > 3 ? 0.27 : 0.33)), background: `linear-gradient(155deg, var(--card-${colorKey}-from), var(--card-${colorKey}-to))` }}
    >
      {tile}
    </span>
  );
}

/** The four kinds' colours on the step chart and the came-in bar. */
export const KIND_FILL: Record<TradeKind, string> = { buy: "var(--positive)", sell: "var(--negative)", rsu: "oklch(0.55 0.15 258)", espp: "oklch(0.55 0.17 300)" };
