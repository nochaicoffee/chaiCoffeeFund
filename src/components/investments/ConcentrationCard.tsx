import type { LimitView } from "@/app/investments/targetViews";
import type { ConcentrationView } from "@/app/investments/understandViews";
import { Tip, TipBody } from "../shell/Tip";
import { WidgetCard } from "../shell/WidgetCard";
import { TargetsButton } from "./TargetsButton";

/**
 * How concentrated (docs/design/investments.md, Understand it): how few holdings carry half and 80% of what he holds, what holding that many
 * equal ones is like, and every holding as a piece of one ladder. Counts only: no limit and no suggestion. His own limits come with the
 * targets tab.
 */
export function ConcentrationCard({ view, limits }: { view: ConcentrationView; limits: LimitView[] }) {
  return (
    <WidgetCard label="How concentrated" title="How concentrated" note="and your own limits" right={<TargetsButton label={limits.length > 0 ? "Change limits" : "Set your limits"} />}>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs font-bold text-muted">Holdings that make half</dt>
          <dd className="text-[26px] leading-tight font-extrabold">{view.forHalf}</dd>
          <dd className="text-xs font-semibold text-muted">{view.forEighty} make 80%</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted">Like holding</dt>
          <dd className="text-[26px] leading-tight font-extrabold">{view.likeHolding}</dd>
          <dd className="text-xs font-semibold text-muted">equal-sized holdings, of {view.holdingCount}</dd>
        </div>
      </dl>

      <div className="relative">
        <ul className="flex h-[30px]" aria-label="Every holding, biggest first, as a share of the whole">
          {view.ladder.map((p, i) => (
            <li key={p.key} style={{ width: `${p.fraction * 100}%` }} className="pr-0.5 last:pr-0">
              <Tip
                label={`${p.name}: ${p.percent}, ${p.worth}`}
                card={<TipBody head={p.name} total={p.percent} detail={p.worth} />}
                width={200}
                align={view.ladder.slice(0, i).reduce((sum, q) => sum + q.fraction, 0) < 0.4 ? "left" : "right"}
                className="block h-full w-full rounded-md"
                style={{ background: `var(--card-${p.colorKey})` }}
              >
                <span className="sr-only">{p.symbol}</span>
              </Tip>
            </li>
          ))}
        </ul>
        {[0.5, 0.8].map((m) => (
          <i key={m} aria-hidden="true" className="absolute -top-1 -bottom-5 w-px bg-muted/60" style={{ left: `${m * 100}%` }}>
            <em className="absolute top-full left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted not-italic">{Math.round(m * 100)}%</em>
          </i>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted">Every holding, biggest first, as a share of the whole: hover a piece.</p>

      <div className="flex flex-col gap-3 border-t border-divider pt-3">
        <b className="text-[13px] font-extrabold">Your limits <small className="font-semibold text-muted">yours, not the app&apos;s</small></b>
        {limits.length === 0 ? (
          <p className="text-xs font-semibold text-muted">You haven&apos;t set any limits. Set one (one holding at most 30%, say) and this checks it against what you hold today. Nothing is set for you.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {limits.map((l) => (
              <li key={l.name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <b className="font-extrabold">{l.label}</b>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${l.breached ? "bg-negative-tint text-negative" : "bg-accent-tint text-positive"}`}>{l.chip}</span>
                </div>
                <div className="relative h-2 rounded-full bg-fill" role="img" aria-label={`${l.label}: ${l.detail}. ${l.chip}.`}>
                  <i className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${Math.min(100, l.now * 100)}%`, background: l.breached ? "var(--negative)" : "var(--positive)" }} />
                  <i aria-hidden="true" className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ left: `${Math.min(100, l.limit * 100)}%` }} />
                </div>
                <small className="text-xs font-semibold text-muted">{l.detail}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs font-semibold text-muted">The app only checks the limits you set against today&apos;s figures. It never suggests one, and a breach isn&apos;t a call to act.</p>
      </div>
    </WidgetCard>
  );
}
