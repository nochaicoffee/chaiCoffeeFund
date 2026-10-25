"use client";

import { useState } from "react";
import { ALL, TAG_SEGMENTS, type CoverMonth, type CoverPick, type CoverSegment, type CoverView } from "@/app/income/views";
import { niceTop } from "./chartScale";
import { Segmented } from "@/components/subscriptions/Segmented";
import { RollingNumber } from "@/components/motion/RollingNumber";
import { RingTexture } from "@/components/RingTexture";
import { formatInr, formatInrCompact } from "@/lib/format/money";

/**
 * The Income page's cover (docs/design/income.md, "The final design"; IncomeZ1): Year in columns. What landed
 * this year, the pick's four figures, then twelve stacked columns, by source or by Regular, bonus and one-off,
 * with a dashed line at a usual month. A column's pending money sits on top in amber; months still to come are
 * dashed boxes at what's scheduled. The source chips pick: the figures become the source's and its part of every
 * month lights up. Mark received, Record income and Edit source come with the forms (#190).
 */

type Mode = "source" | "tag";

const CHART_HEIGHT = 240;


interface ShownMonth {
  month: CoverMonth;
  total: number;
  pending: number;
  expected: number;
  segments: CoverSegment[];
}

/**
 * A month as drawn for the pick: every source stacked (or Regular, bonus and one-off) for all sources; just the
 * picked source's money, its own pending and its own schedule for one, so a small source is still readable.
 */
function shownMonth(month: CoverMonth, mode: Mode, pick: CoverPick): ShownMonth {
  if (pick.id === ALL) return { month, total: month.total, pending: month.pending, expected: month.expected, segments: mode === "source" ? month.bySource : month.byTag };
  const mine = month.parts.filter((p) => p.sourceId === pick.id);
  const total = mine.reduce((t, p) => t + p.amount, 0);
  const segments: CoverSegment[] =
    mode === "source"
      ? total > 0 ? [{ key: pick.id, label: pick.label, colorKey: pick.colorKey, amount: total }] : []
      : TAG_SEGMENTS.map((t) => ({ key: t.tag, label: t.label, colorKey: t.colorKey, amount: mine.filter((p) => p.tag === t.tag).reduce((a, p) => a + p.amount, 0) })).filter((x) => x.amount > 0);
  return { month, total, pending: month.pendingOf[pick.id] ?? 0, expected: month.expectedOf[pick.id] ?? 0, segments };
}

export function IncomeCover({ cover, pickId, onPick }: { cover: CoverView; pickId: string; onPick: (id: string) => void }) {
  const [mode, setMode] = useState<Mode>("source");
  const pick: CoverPick = cover.picks.find((p) => p.id === pickId) ?? cover.picks[0];
  const shown = cover.months.map((m) => shownMonth(m, mode, pick));
  const top = niceTop(Math.max(pick.line.amount, ...shown.map((m) => Math.max(m.total + m.pending, m.expected))));
  const ticks = [top / 2, top].filter((t) => t > 0);
  const y = (amount: number) => (amount / top) * CHART_HEIGHT;
  const legend = mode === "tag" ? TAG_SEGMENTS.map((t) => ({ key: t.tag, label: t.label, colorKey: t.colorKey })) : pick.id === ALL ? cover.sources.map((s) => ({ key: s.id, label: s.label, colorKey: s.colorKey })) : [{ key: pick.id, label: pick.label, colorKey: pick.colorKey }];

  return (
    <section aria-label="Money in" className="flex min-w-0 flex-col gap-5 rounded-[26px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">Money in · {pick.eyebrow}</span>
        <Segmented label="Columns by" options={[{ value: "source", label: "By source" }, { value: "tag", label: "Regular & bonus" }]} value={mode} onChange={setMode} small />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <b className="text-[44px] leading-none font-extrabold tracking-[-0.03em] tabular-nums md:text-[60px]">
            <RollingNumber value={pick.total} format="inr" />
          </b>
          {pick.change && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${pick.change.up ? "bg-accent-tint text-accent-text" : "bg-fill text-muted"}`}>
              {pick.change.up ? "↑" : "↓"} {pick.change.text}
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          {pick.figures.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">{f.label}</dt>
              <dd className={`truncate text-lg font-extrabold tabular-nums md:text-xl ${f.tone === "warn" ? "text-warning-text" : ""}`}>{f.value}</dd>
              <dd className={`text-[11.5px] font-semibold ${f.tone === "warn" ? "text-warning-text" : f.tone === "good" ? "text-accent-text" : "text-muted"}`}>{f.note}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Pick a source">
        {[{ id: ALL, label: "All sources", colorKey: "emerald", inactive: false }, ...cover.sources].map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={pick.id === s.id}
            onClick={() => onPick(s.id)}
            className="inline-flex min-h-9 items-center gap-2 rounded-full bg-fill px-3.5 text-[12.5px] font-extrabold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-ink aria-pressed:text-on-ink md:min-h-8"
          >
            {s.id !== ALL && <i aria-hidden="true" className="size-2 rounded-full" style={{ background: `var(--card-${s.colorKey})` }} />}
            {s.label}
            {s.inactive && <span className="text-[10.5px] font-semibold opacity-70">done</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] font-semibold text-muted" aria-hidden="true">
        {legend.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px]" style={{ background: `var(--card-${l.colorKey})` }} />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] border border-dashed border-muted" />
          Expected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] border border-dashed border-warning bg-warning-tint" />
          Pending
        </span>
      </div>

      <figure className="m-0 flex flex-col gap-2">
        <div className="relative" style={{ height: CHART_HEIGHT + 22 }}>
          {ticks.map((t) => (
            <div key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-divider" style={{ bottom: y(t) + 22 }}>
              <span className="absolute -top-2.5 left-0 bg-surface pr-1 text-[10px] font-bold text-muted">{formatInrCompact(t)}</span>
            </div>
          ))}
          {pick.line.amount > 0 && (
            <div aria-hidden="true" className="absolute inset-x-0 z-10 border-t-[1.5px] border-dashed border-fg/45" style={{ bottom: y(pick.line.amount) + 22 }}>
              <span className="absolute left-8 -top-3 rounded-full border border-accent/30 bg-accent-tint px-2 py-px text-[10.5px] font-extrabold whitespace-nowrap text-accent-text">{pick.line.label} {formatInr(pick.line.amount)}</span>
            </div>
          )}
          <ol className="absolute inset-0 flex items-end gap-1 pl-7 sm:gap-2 md:gap-3">
            {shown.map((m) => (
              <Column key={m.month.key} shown={m} y={y} />
            ))}
          </ol>
        </div>
        <figcaption className="text-[11.5px] font-semibold text-muted">A month counts what landed in it, by the day it was received. {pick.id === ALL ? "Pick a source to see just its months." : `Just ${pick.label}, on its own scale.`}</figcaption>
      </figure>
    </section>
  );
}

function Column({ shown, y }: { shown: ShownMonth; y: (n: number) => number }) {
  const { month, total, pending, expected, segments } = shown;
  const label = [formatInrCompact(total), pending ? `${formatInrCompact(pending)} pending` : "", expected ? `${formatInrCompact(expected)} expected` : ""].filter(Boolean).join(", ");
  return (
    <li className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" aria-label={`${month.label}: ${total || pending || expected ? label : "nothing"}`}>
      {(total > 0 || expected > 0 || pending > 0) && <span className={`text-[10px] font-extrabold tabular-nums ${month.future ? "text-muted" : total ? "" : "text-warning-text"} max-sm:hidden`}>{formatInrCompact(total || expected || pending)}</span>}
      {month.future && expected > 0 ? (
        <span className="block w-full rounded-[10px] border-[1.5px] border-dashed border-fg/30 bg-fill" style={{ height: y(expected) }} />
      ) : (
        <span className="relative isolate flex w-full flex-col-reverse overflow-hidden rounded-[10px] shadow-[inset_0_1px_0_oklch(1_0_0/0.25)]" style={{ height: (total ? Math.max(3, y(total)) : 0) + (pending ? y(pending) : 0) }}>
          {segments.map((s) => (
            <i key={s.key} className="block w-full border-t border-surface/60 first:border-t-0" style={{ height: y(s.amount), background: `linear-gradient(180deg, color-mix(in oklch, var(--card-${s.colorKey}) 80%, white), var(--card-${s.colorKey}))` }} />
          ))}
          {pending > 0 && <i className="block w-full rounded-t-[10px] border-[1.5px] border-dashed border-warning bg-warning-tint" style={{ height: y(pending) }} />}
          {total > 0 && <RingTexture width={120} height={260} dx={30} dy={20} first={30} step={16} stroke="var(--rings-light)" opacity={0.14} />}
        </span>
      )}
      <span className={`text-[10.5px] font-extrabold ${month.current ? "text-fg" : "text-muted"}`}>
        <span className="sm:hidden">{month.label[0]}</span>
        <span className="max-sm:hidden">{month.label.toUpperCase()}</span>
      </span>
    </li>
  );
}
