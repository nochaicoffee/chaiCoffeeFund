import type { GainView } from "@/app/investments/understandViews";
import { WidgetCard } from "../shell/WidgetCard";

const TONE = { gain: "text-positive", loss: "text-negative", plain: "text-muted" } as const;

/**
 * Who made the gain (docs/design/investments.md, Understand it): each holding's gain, split into what its price did and what the rupee did,
 * with its share of the whole gain. A measure, never a suggestion.
 */
export function GainCard({ view }: { view: GainView }) {
  return (
    <WidgetCard
      label="Who made the gain"
      title="Who made the gain"
      note="each holding's gain, and its share of the whole"
      right={
        <span className="flex gap-3 text-[11px] font-bold text-muted">
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="block size-2.5 rounded-[3px]" style={{ background: "var(--card-sapphire)" }} />price</span>
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="block size-2.5 rounded-[3px]" style={{ background: "var(--card-copper)" }} />the rupee</span>
        </span>
      }
      gap="gap-2"
    >
      <ul className="flex flex-col gap-2.5">
        {view.rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[28px_minmax(0,9rem)_minmax(0,1fr)_auto]">
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-[9px] text-[9px] font-extrabold text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${r.colorKey}-from), var(--card-${r.colorKey}-to))` }}>
              {r.tile}
            </span>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-extrabold">{r.symbol}</b>
              <small className="block truncate text-[11px] font-semibold text-muted">{r.name}</small>
            </span>
            <span
              className="col-span-2 flex h-2.5 items-center gap-px sm:col-span-1"
              role="img"
              aria-label={`${r.symbol}: price ${r.priceText}, the rupee ${r.rupeeText}`}
            >
              <i className="block h-full rounded-full" style={{ width: `${r.priceBar * 100}%`, background: r.priceText.startsWith("−") ? "var(--negative)" : "var(--card-sapphire)" }} />
              {r.rupeeBar > 0 && <i className="block h-full rounded-full" style={{ width: `${r.rupeeBar * 100}%`, background: r.rupeeText.startsWith("−") ? "var(--negative)" : "var(--card-copper)" }} />}
            </span>
            <span className="col-span-2 flex items-baseline justify-between gap-3 text-right sm:col-span-1 sm:block sm:min-w-[7.5rem]">
              <b className={`block text-[13px] font-extrabold ${TONE[r.gainTone]}`}>{r.gain}</b>
              <small className="block text-[11px] font-semibold text-muted">{r.share}</small>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-divider pt-3 text-[13px] font-semibold">
        <span>Together</span>
        <b className={`font-extrabold ${TONE[view.totalTone]}`}>
          {view.total}
          {view.totalFraction && ` · ${view.totalFraction}`}
        </b>
      </div>
      {(view.rupeeNote || view.sharesNote) && (
        <p className="text-xs font-semibold text-muted">
          {view.sharesNote} {view.rupeeNote}
        </p>
      )}
    </WidgetCard>
  );
}
