import type { StripView } from "@/app/subscriptions/renewals/views";
import { RingTexture } from "../RingTexture";
import { ArrowIcon } from "./icons";
import { Mono } from "./parts";
import { PriceStepChart } from "./PriceStepChart";

/**
 * The strip above the table when it's filtered to one subscription (SubsRenewalsStates,
 * "One subscription"): what it has cost, how many payments, what it costs now, and
 * what each payment cost.
 */
export function SubscriptionStrip({ strip, today }: { strip: StripView; today: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr] lg:gap-5">
      <div className="relative isolate flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-[22px] border border-feature-tile-line bg-feature-tile px-5 py-[18px] shadow-soft">
        <RingTexture width={520} height={170} dx={12} dy={30} first={30} step={22} stroke="var(--feature-tile-rings)" sheen="radial-gradient(circle at 92% 8%, var(--feature-tile-glow), transparent 45%)" />
        <div className="flex min-w-0 items-center gap-3">
          <Mono mark={strip.mark} size={40} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold">{strip.name}</h2>
            <p className="text-xs leading-snug font-semibold text-muted">{strip.detail}</p>
          </div>
        </div>
        <dl className="mt-1 grid grid-cols-3 gap-2.5">
          {strip.figures.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs font-semibold text-muted">{f.label}</dt>
              <dd className="truncate text-lg font-extrabold tabular-nums md:text-xl">
                {f.value}
                {f.unit && <small className="ml-0.5 text-xs font-semibold text-muted">{f.unit}</small>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <section aria-labelledby="price-history-title" className="flex min-w-0 flex-col gap-1.5 rounded-[22px] border border-surface-line bg-surface px-[18px] py-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="price-history-title" className="text-[10px] font-bold tracking-[0.03em] text-muted uppercase">
            What each payment cost
          </h3>
          {strip.lastChange ? (
            <span className={`inline-flex items-center gap-[3px] text-[11px] font-bold ${strip.lastChange.up ? "text-negative" : "text-positive"}`}>
              <ArrowIcon up={strip.lastChange.up} />
              {strip.lastChange.text}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-muted">The price hasn&apos;t changed</span>
          )}
        </div>
        <PriceStepChart points={strip.points} changes={strip.changes} today={today} alias={strip.mark.alias} />
      </section>
    </div>
  );
}
