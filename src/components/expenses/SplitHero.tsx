import Link from "next/link";
import type { HeroView, SplitSegment } from "@/app/expenses/views";
import { colorGradient } from "@/lib/format/colors";
import { formatInr } from "@/lib/format/money";
import { ChipStrip } from "./ChipStrip";

import { HATCH } from "./hatch";

/** A segment's face: its bright flat shade where a look sets `--face-<key>` (Neubrutalism), else the colour's swatch. */
const face = (key: string) => `var(--face-${key}, var(--card-${key}))`;

/**
 * One row of the split: each segment as wide as its share, its name and amount inside. A tiny one keeps room for its label.
 * `joined` (what came in) is one bar under Neubrutalism, as on its board: an ink outline, the segments butted together with ink
 * lines between them. The parts stay apart as outlined boxes. Classic reads every fallback, so it doesn't change.
 * On a phone the segments' minimum widths don't fit: the bar scrolls sideways inside itself and the parts wrap, so the page
 * doesn't widen past the screen.
 */
function SplitRow({ segments, label, joined = false }: { segments: SplitSegment[]; label: string; joined?: boolean }) {
  return (
    <div
      role="list"
      aria-label={label}
      className={
        joined
          ? "flex gap-[var(--split-gap,0.375rem)] overflow-x-auto rounded-[var(--split-radius,0px)] border-[length:var(--split-edge,0px)] border-[color:var(--split-edge-color,currentColor)] [box-shadow:var(--split-shadow,none)]"
          : "flex flex-wrap gap-[var(--split-parts-gap,0.375rem)] sm:[flex-wrap:var(--split-parts-wrap,nowrap)]"
      }
    >
      {segments.map((s) => (
        <div
          key={s.key}
          role="listitem"
          className={`flex min-h-[56px] min-w-[84px] flex-col justify-center px-3.5 py-2 text-[color:var(--on-face,var(--color-white))] ${
            joined
              ? "rounded-[var(--split-seg-radius,14px)] border-r-[length:var(--split-seg-edge,0px)] border-[color:var(--split-edge-color,currentColor)] last:border-r-0"
              : "rounded-[var(--split-part-radius,14px)] card-edge [box-shadow:var(--split-part-shadow,none)]"
          }`}
          style={{ flexGrow: s.share, flexBasis: 0, background: s.hatched ? `${HATCH}, ${face(s.colorKey)}` : face(s.colorKey) }}
        >
          <span className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase label-face opacity-85">{s.label}</span>
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
    <section aria-label="Spent this month" className="flex flex-col gap-5 rounded-[26px] p-5 text-on-card md:p-8 card-edge card-lift" style={{ background: `var(--hero-expenses, ${colorGradient("indigo", 140)})` }}>
      <div className="text-xs font-extrabold tracking-[0.06em] uppercase label-face opacity-80">{view.eyebrow}</div>
      <div className="text-[clamp(40px,8vw,92px)] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums [text-shadow:var(--hero-num-shadow,none)]">{formatInr(Math.round(view.value))}</div>
      {view.pills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {view.pills.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5 rounded-[var(--btn-radius,calc(infinity*1px))] btn-edge bg-[var(--hero-chip,color-mix(in_oklab,var(--color-white)_12%,transparent))] px-3 py-1.5 text-xs font-semibold">
              <b className={`font-extrabold ${p.tone === "good" ? "text-[var(--on-card-up,oklch(0.86_0.15_150))]" : p.tone === "bad" ? "text-[var(--on-card-down,oklch(0.85_0.12_40))]" : ""}`}>{p.strong}</b>
              {p.text}
            </span>
          ))}
        </div>
      )}
      {view.notice && <p className="max-w-[760px] rounded-[14px] bg-white/10 px-4 py-3 text-[13px] leading-relaxed font-semibold">{view.notice}</p>}
      {view.cameIn && (
        <div className="flex min-h-[56px] flex-col justify-center rounded-[14px] card-edge bg-white/90 px-4 py-2 text-[oklch(0.25_0.04_270)]">
          <span className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase label-face opacity-70">{view.cameIn.label}</span>
          <b className="text-[19px] leading-tight font-extrabold tabular-nums">{view.cameIn.amount}</b>
        </div>
      )}
      {view.split.length > 0 && <SplitRow joined segments={view.split} label="What came in, split" />}
      {view.splitNote && <p className="-mt-2 text-xs font-semibold opacity-80">{view.splitNote}</p>}
      {view.parts.length > 0 && <SplitRow segments={view.parts} label={view.split.length > 0 ? "Spent, in parts" : "Paid, in parts"} />}
      <ChipStrip picked={view.chips.find((c) => c.picked)?.month ?? ""} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {view.chips.map((c) => (
          <Link
            key={c.month}
            href={`/expenses?month=${c.month}`}
            scroll={false}
            aria-current={c.picked ? "true" : undefined}
            className={`relative flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-[14px] btn-edge px-2 pt-2.5 pb-2 text-center focus-visible:outline-2 focus-visible:outline-[var(--on-card-mark)] ${c.picked ? "bg-[var(--hero-chip-on,var(--color-white))] text-[color:var(--hero-chip-on-ink,oklch(0.25_0.04_270))]" : "bg-[var(--hero-chip,color-mix(in_oklab,var(--color-white)_8%,transparent))] hover:bg-[var(--hero-chip-hover,color-mix(in_oklab,var(--color-white)_15%,transparent))]"}`}
          >
            <span aria-hidden="true" className="flex h-6 w-3 items-end overflow-hidden rounded-[4px] bg-current/15">
              <i className="block w-full rounded-[4px] bg-current" style={{ height: `${Math.max(c.status === "done" ? 12 : 0, c.level * 100)}%`, opacity: c.status === "done" ? 0.9 : 0.4 }} />
            </span>
            <b className="text-[13px] font-extrabold">{c.label}</b>
            <small className={`text-[10.5px] font-semibold tabular-nums ${c.picked ? "opacity-70" : "opacity-75"}`}>{c.amount}</small>
            {c.hasBig && <span aria-label="has a big spend" className={`absolute top-1.5 right-2 text-[10px] ${c.picked ? "text-[var(--hero-chip-on-flag,var(--on-card-flag,oklch(0.85_0.13_85)))]" : "text-[var(--on-card-flag,oklch(0.85_0.13_85))]"}`}>★</span>}
          </Link>
        ))}
      </ChipStrip>
    </section>
  );
}
