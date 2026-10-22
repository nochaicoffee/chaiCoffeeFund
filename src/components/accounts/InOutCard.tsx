import type { PickDetail } from "@/app/accounts/detailView";
import { RingTexture } from "../RingTexture";

const SPLIT_SHADES = ["var(--heat-5)", "var(--heat-4)", "var(--heat-3)", "var(--heat-2)", "var(--heat-1)"];

/**
 * "This year, in and out" (docs/design/accounts.md): what came in, the expenses, what was
 * invested and what was saved, and one bar splitting what came in by source. All of it is worked
 * out from income received and the card bills, subscriptions, EMIs and buys paid from the account
 * (decision 19: saved is came in less expenses, so investing counts as saved).
 */
export function InOutCard({ detail }: { detail: PickDetail }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="In and out">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">
          {detail.periodName}, in and out <small className="ml-2 text-xs font-semibold text-muted">Worked out from your records</small>
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {detail.tiles.map((t, i) => (
          <div key={t.label} className={`relative isolate overflow-hidden rounded-[18px] p-4 ${i === 3 ? "border border-feature-tile-line bg-feature-tile" : "bg-fill"}`}>
            <RingTexture width={200} height={100} dx={6} dy={10} first={30} step={22} stroke={i === 3 ? "var(--rings-ink)" : "var(--rings-ink)"} opacity={i === 3 ? 0.12 : 0.05} />
            <div className="text-xs font-semibold text-muted">{t.label}</div>
            <div className={`mt-1 text-lg font-extrabold tabular-nums whitespace-nowrap md:text-2xl ${t.tone === "negative" ? "text-negative" : ""}`}>{t.value}</div>
            {t.note && <div className="mt-0.5 text-[11px] font-semibold text-muted">{t.note}</div>}
          </div>
        ))}
      </div>
      {detail.split.length > 0 ? (
        <div>
          <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`What came in: ${detail.split.map((s) => `${s.source} ${Math.round(s.share * 100)}%`).join(", ")}`}>
            {detail.split.map((s, i) => (
              <span key={s.source} className="relative block h-full overflow-hidden" style={{ width: `${s.share * 100}%`, background: SPLIT_SHADES[Math.min(i, SPLIT_SHADES.length - 1)] }}>
                <RingTexture width={120} height={14} dx={4} dy={2} first={10} step={9} stroke="var(--rings-light)" opacity={0.18} />
              </span>
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
            {detail.split.map((s, i) => (
              <li key={s.source} className="inline-flex items-center gap-1.5">
                <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: SPLIT_SHADES[Math.min(i, SPLIT_SHADES.length - 1)] }} />
                {s.source} <b className="font-extrabold text-fg">{s.text}</b> · {Math.round(s.share * 100)}%
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs font-semibold text-muted">Nothing came in {detail.periodName.toLowerCase()}, as far as your income records show.</p>
      )}
    </section>
  );
}
