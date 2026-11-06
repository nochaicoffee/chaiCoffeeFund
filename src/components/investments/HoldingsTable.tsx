import type { HoldingTableRow, ReturnCard } from "@/app/investments/views";
import { WidgetCard } from "../shell/WidgetCard";

const TONE: Record<ReturnCard["tone"], string> = { gain: "text-positive", loss: "text-negative", plain: "text-fg" };
const COLS = "lg:grid-cols-[minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)]";

/** What he holds, biggest first: shares, today's price, what it is worth, the gain, its share of the whole and the last day's move. */
export function HoldingsTable({ rows }: { rows: HoldingTableRow[] }) {
  return (
    <WidgetCard label="Holdings" title="Holdings" note="biggest first · US holdings at today's dollar rate">
      <div className="flex flex-col">
        <div className={`hidden gap-3 px-1 pb-2 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:grid ${COLS}`} aria-hidden="true">
          <span>Holding</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Price</span>
          <span className="text-right">Worth</span>
          <span className="text-right">Gain</span>
          <span className="text-right">Share</span>
          <span className="text-right">Today</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className={`grid items-center gap-x-3 gap-y-2 border-t border-divider px-1 py-3.5 max-lg:grid-cols-2 ${COLS}`}>
            <div className="flex min-w-0 items-center gap-3 max-lg:col-span-2">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-[11px] font-extrabold text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${r.colorKey}-from), var(--card-${r.colorKey}-to))` }}>
                {r.sub.split(" ")[0].slice(0, 4)}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                <span className="block truncate text-[11px] font-medium text-muted">{r.sub}</span>
              </span>
            </div>
            <Cell label="Shares" className="lg:text-right"><b>{r.quantity}</b></Cell>
            <Cell label="Price" className="lg:text-right">
              <b>{r.price}</b>
              {r.priceNote && <small className="text-negative">{r.priceNote}</small>}
            </Cell>
            <Cell label="Worth" className="lg:text-right"><b>{r.worth}</b></Cell>
            <Cell label="Gain" className="lg:text-right">
              <b className={TONE[r.gainTone]}>{r.gain}</b>
              <small className={TONE[r.gainTone]}>{r.gainNote}</small>
            </Cell>
            <Cell label="Share" className="lg:text-right">
              <b>{r.share}</b>
              <span aria-hidden="true" className="mt-1 block h-1 overflow-hidden rounded-full bg-fill lg:ml-auto lg:w-16">
                <i className="block h-full rounded-full" style={{ width: `${Math.min(100, r.shareFraction * 100)}%`, background: `var(--card-${r.colorKey})` }} />
              </span>
            </Cell>
            <Cell label="Today" className="lg:text-right"><b className={TONE[r.dayTone]}>{r.day}</b></Cell>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

function Cell({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col text-[13px] [&_small]:text-[11px] [&_small]:font-semibold ${className}`}>
      <span className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:hidden">{label}</span>
      {children}
    </div>
  );
}
