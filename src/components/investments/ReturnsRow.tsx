import type { ReactNode } from "react";
import type { ReturnCard } from "@/app/investments/views";
import { Tip, TipBody } from "../shell/Tip";

/**
 * The Returns row (docs/design/investments.md, "Key metrics"): six cards with an icon, the figure big, a grey line after it and sometimes a
 * dark pill. Hovering or focusing a card opens a light card that says what is behind the figure. It is for everything, as of today.
 */

const ICONS: Record<ReturnCard["icon"], ReactNode> = {
  calendar: <path d="M4 7h16M7 3v4M17 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  trend: <path d="m4 16 5-5 4 4 7-8M15 7h5v5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  coins: <path d="M12 6c4.4 0 8 1 8 2.5S16.4 11 12 11 4 10 4 8.5 7.6 6 12 6Zm8 2.5v4C20 14 16.4 15 12 15s-8-1-8-2.5v-4M20 12.5v4c0 1.5-3.6 2.5-8 2.5s-8-1-8-2.5v-4" />,
  down: <path d="m4 8 5 5 4-4 7 8M15 17h5v-5" />,
};

function Icon({ name }: { name: ReturnCard["icon"] }) {
  return (
    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-fill">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
    </span>
  );
}

export function ReturnsRow({ cards }: { cards: ReturnCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label="Returns" className="flex flex-col gap-3">
      <h2 className="px-1 text-base font-extrabold">
        Returns
        <small className="ml-2 text-xs font-semibold text-muted">for everything, as of today</small>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const body = (
            <div className="flex h-full flex-col gap-5 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Icon name={c.icon} />
                {c.label}
              </div>
              <div className={`flex flex-wrap items-baseline gap-2 text-[30px] font-extrabold tracking-tight tabular-nums ${c.muted ? "text-muted" : ""}`}>
                {c.value}
                {c.small && <small className="text-[13px] font-bold tracking-normal text-muted">{c.small}</small>}
                {c.pill && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-extrabold tracking-normal text-on-ink">{c.pill}</span>}
              </div>
            </div>
          );
          if (!c.tip) return <div key={c.key}>{body}</div>;
          return (
            <Tip key={c.key} className="block" place="down" align="left" width={300} label={`${c.label}: ${[c.value, c.small].filter(Boolean).join(" ")}. What is behind it.`} card={<TipBody head={c.tip.head} total={c.tip.total} detail={c.tip.detail} rows={c.tip.rows} foot={c.tip.foot} />}>
              {body}
            </Tip>
          );
        })}
      </div>
    </section>
  );
}
