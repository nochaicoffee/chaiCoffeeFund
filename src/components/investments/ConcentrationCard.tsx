import type { ConcentrationView } from "@/app/investments/understandViews";
import { Tip, TipBody } from "../shell/Tip";
import { WidgetCard } from "../shell/WidgetCard";

/**
 * How concentrated (docs/design/investments.md, Understand it): how few holdings carry half and 80% of what he holds, what holding that many
 * equal ones is like, and every holding as a piece of one ladder. Counts only: no limit and no suggestion. His own limits come with the
 * targets tab.
 */
export function ConcentrationCard({ view }: { view: ConcentrationView }) {
  return (
    <WidgetCard label="How concentrated" title="How concentrated" note="how few holdings carry the weight">
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
      <p className="mt-4 text-xs font-semibold text-muted">
        Every holding, biggest first, as a share of the whole: hover a piece. The app counts and never suggests.
      </p>
    </WidgetCard>
  );
}
