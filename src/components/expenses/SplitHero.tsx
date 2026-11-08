import Link from "next/link";
import type { HeroView, SplitSegment } from "@/app/expenses/views";
import { colorGradient } from "@/lib/format/colors";
import { formatInr } from "@/lib/format/money";
import { ChipStrip } from "./ChipStrip";

import { HATCH } from "./hatch";

/** One row of the split: each segment as wide as its share, its name and amount inside. A tiny one keeps room for its label. */
function SplitRow({ segments, label }: { segments: SplitSegment[]; label: string }) {
  return (
    <div role="list" aria-label={label} className="flex gap-1.5">
      {segments.map((s) => (
        <div
          key={s.key}
          role="listitem"
          className="flex min-h-[56px] min-w-[84px] flex-col justify-center rounded-[14px] px-3.5 py-2 text-white"
          style={{ flexGrow: s.share, flexBasis: 0, background: s.hatched ? `${HATCH}, var(--card-${s.colorKey})` : `var(--card-${s.colorKey})` }}
        >
          <span className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase opacity-85">{s.label}</span>
          <b className="text-[17px] leading-tight font-extrabold tabular-nums">{s.amount}</b>
        </div>
      ))}
    </div>
  );
}

/**
 * The Expenses hero (docs/design/expenses.md, ExF1: E1 Split): the month's spending as one big number, what came in as a bar, split into spent,
 * invested, lent out and kept, then spent opened into its parts. The months run along the foot as chips; picking one moves the page to it
 * (`?month=`). A month in progress or not worked out shows what's recorded instead, and says why.
 */
export function SplitHero({ view }: { view: HeroView }) {
  return (
    <section aria-label="Spent this month" className="flex flex-col gap-5 rounded-[26px] p-5 text-on-card md:p-8" style={{ background: colorGradient("indigo", 140) }}>
      <div className="text-xs font-extrabold tracking-[0.06em] uppercase opacity-80">{view.eyebrow}</div>
      <div className="text-[clamp(40px,8vw,92px)] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums">{formatInr(Math.round(view.value))}</div>
      {view.pills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {view.pills.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold">
              <b className={`font-extrabold ${p.tone === "good" ? "text-[oklch(0.86_0.15_150)]" : p.tone === "bad" ? "text-[oklch(0.85_0.12_40)]" : ""}`}>{p.strong}</b>
              {p.text}
            </span>
          ))}
        </div>
      )}
      {view.notice && <p className="max-w-[760px] rounded-[14px] bg-white/10 px-4 py-3 text-[13px] leading-relaxed font-semibold">{view.notice}</p>}
      {view.cameIn && (
        <div className="flex min-h-[56px] flex-col justify-center rounded-[14px] bg-white/90 px-4 py-2 text-[oklch(0.25_0.04_270)]">
          <span className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase opacity-70">{view.cameIn.label}</span>
          <b className="text-[19px] leading-tight font-extrabold tabular-nums">{view.cameIn.amount}</b>
        </div>
      )}
      {view.split.length > 0 && <SplitRow segments={view.split} label="What came in, split" />}
      {view.splitNote && <p className="-mt-2 text-xs font-semibold opacity-80">{view.splitNote}</p>}
      {view.parts.length > 0 && <SplitRow segments={view.parts} label={view.split.length > 0 ? "Spent, in parts" : "Paid, in parts"} />}
      <ChipStrip picked={view.chips.find((c) => c.picked)?.month ?? ""} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {view.chips.map((c) => (
          <Link
            key={c.month}
            href={`/expenses?month=${c.month}`}
            scroll={false}
            aria-current={c.picked ? "true" : undefined}
            className={`relative flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-[14px] px-2 pt-2.5 pb-2 text-center focus-visible:outline-2 focus-visible:outline-white ${c.picked ? "bg-white text-[oklch(0.25_0.04_270)]" : "bg-white/8 hover:bg-white/15"}`}
          >
            <span aria-hidden="true" className="flex h-6 w-3 items-end overflow-hidden rounded-[4px] bg-current/15">
              <i className="block w-full rounded-[4px] bg-current" style={{ height: `${Math.max(c.status === "done" ? 12 : 0, c.level * 100)}%`, opacity: c.status === "done" ? 0.9 : 0.4 }} />
            </span>
            <b className="text-[13px] font-extrabold">{c.label}</b>
            <small className={`text-[10.5px] font-semibold tabular-nums ${c.picked ? "opacity-70" : "opacity-75"}`}>{c.amount}</small>
            {c.hasBig && <span aria-label="has a big spend" className="absolute top-1.5 right-2 text-[10px] text-[oklch(0.85_0.13_85)]">★</span>}
          </Link>
        ))}
      </ChipStrip>
    </section>
  );
}
