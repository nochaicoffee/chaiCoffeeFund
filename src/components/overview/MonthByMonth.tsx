"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { columnLabel, type MeasureView, type MonthlyView, type MonthTipView } from "@/app/overview/monthlyView";
import { FLOW_KEYS, type FlowKey } from "@/lib/aggregate/monthlyFlows";
import { colorGradient } from "@/lib/format/colors";
import { formatMonthYear } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { Cell, SpendHeatmap } from "../cards/SpendHeatmap";
import { MonthCardHover } from "../shell/MonthCardHover";

/** A measure's own five shades, the Cards heatmap's green turned to its hue; every cell under it reads these (`--heat-1` to `--heat-5`). */
function heatStyle(hue: number): CSSProperties {
  const shade = [[0.95, 0.03], [0.87, 0.07], [0.76, 0.11], [0.6, 0.12], [0.42, 0.1]];
  const vars: Record<string, string> = Object.fromEntries(shade.map(([l, c], i) => [`--heat-${i + 1}`, `oklch(${l} ${c} ${hue})`]));
  vars["--heat-ink"] = `oklch(0.24 0.05 ${hue})`;
  vars["--rings-ink"] = `oklch(0.42 0.1 ${hue})`;
  return vars as CSSProperties;
}

type Focus = FlowKey | "all";

/** A cell is a measure's month: the row or panel it sits in names the measure (`data-measure`), the cell the month (`data-month`). */
const keyOf = (cell: HTMLElement) => {
  const measure = cell.closest<HTMLElement>("[data-measure]")?.dataset.measure;
  return measure && cell.dataset.month ? `${measure}:${cell.dataset.month}` : null;
};

function MeasureHover({ view, children }: { view: MonthlyView; children: ReactNode }) {
  const tips = useMemo(() => new Map<string, MonthTipView>(view.measures.flatMap((m) => Object.values(m.tips).map((t): [string, MonthTipView] => [`${m.meta.key}:${t.month}`, t]))), [view]);
  return (
    <MonthCardHover resolve={(cell) => {
      const key = keyOf(cell);
      return key && tips.has(key) ? key : null;
    }} render={(key) => <TipCard tip={tips.get(key)!} />}>
      {children}
    </MonthCardHover>
  );
}

/** The card over a month: its figure, against a usual month and the others, and what it is made of (monthlyView.ts, monthTip). */
function TipCard({ tip }: { tip: MonthTipView }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span>{formatMonthYear(tip.month)}</span>
        {tip.tag === "Peak" ? (
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-extrabold text-accent-text">Peak</span>
        ) : tip.tag === "This month" ? (
          <span className="rounded-full bg-fill px-2 py-0.5 text-[10px] font-extrabold">This month</span>
        ) : null}
      </div>
      <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{tip.total}</div>
      {tip.versus && <div className={`mt-0.5 text-xs font-semibold ${tip.versus.tone === "good" ? "text-positive" : tip.versus.tone === "bad" ? "text-negative" : "text-muted"}`}>{tip.versus.text}</div>}
      {tip.rank && <div className="mt-0.5 text-xs font-semibold text-muted">{tip.rank}</div>}
      {tip.rows.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1 border-t border-divider pt-2">
          {tip.rows.map((r, i) => (
            <li key={`${r.name}${i}`} className="flex items-center gap-2 text-xs font-semibold">
              <span className="min-w-0 flex-1 truncate text-muted">{r.name}</span>
              <span className="font-extrabold tabular-nums">{r.amount}</span>
            </li>
          ))}
        </ul>
      )}
      {tip.foot && <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">{tip.foot}</div>}
    </>
  );
}

const BUTTON_BASE = "flex min-h-[52px] min-w-0 flex-1 basis-[210px] cursor-pointer items-center gap-2.5 rounded-[20px] border border-surface-line px-4 py-2.5 text-left shadow-soft transition-[translate,background,color] duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function FlowBadge({ m }: { m: MeasureView }) {
  return <span aria-hidden="true" className="size-8 shrink-0 rounded-[10px]" style={{ background: colorGradient(m.meta.colorKey) }} />;
}

/**
 * The Overview's "Month by month" widget (docs/design/overview.md, board MzA): income, investments, EMIs, credit card bills and cash
 * expenses as five separate heatmaps, in each one's own colour and on its own scale. Over a year or less they sit side by side, so the
 * months line up and can be compared; a button looks at one on its own, as the Cards heatmap draws it. Past a year, five at once is too
 * much, so "All five" is dim and one measure shows at a time. The period is the page's own, chosen at the top like on the other dashboards.
 */
export function MonthByMonth({ view }: { view: MonthlyView }) {
  const [picked, setPicked] = useState<Focus>("all");
  // "All five" can't hold past a year, so the first measure stands in until one is picked.
  const focus: Focus = view.together ? picked : picked === "all" ? FLOW_KEYS[0] : picked;
  const one = focus === "all" ? null : view.measures.find((m) => m.meta.key === focus)!;

  return (
    <section aria-labelledby="monthly-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">Month by month · {view.periodLabel}</p>
          <h2 id="monthly-heading" className="mt-0.5 text-xl font-extrabold tracking-tight">
            Where each month&apos;s money went
          </h2>
        </div>
      </div>

      <div role="group" aria-label="Show" className="flex flex-wrap gap-2.5">
        <button
          type="button"
          aria-pressed={focus === "all"}
          disabled={!view.together}
          title={view.together ? undefined : "Over a year, five at once is too much. Pick a shorter period to see them together."}
          onClick={() => setPicked("all")}
          className={`${BUTTON_BASE} basis-[140px] flex-[0.7] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${focus === "all" ? "bg-ink text-on-ink" : "bg-surface"}`}
        >
          <span aria-hidden="true" className="grid size-8 shrink-0 grid-cols-2 gap-[3px] rounded-[10px] bg-fill p-[7px]">
            {FLOW_KEYS.slice(0, 4).map((k) => (
              <i key={k} className="rounded-[2px] bg-current opacity-70" />
            ))}
          </span>
          <span className="min-w-0 text-[13px] font-bold">All five</span>
        </button>
        {view.measures.map((m) => {
          const on = focus === m.meta.key;
          return (
            <button
              key={m.meta.key}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(m.meta.key)}
              className={`${BUTTON_BASE} ${on ? "border-transparent text-on-card shadow-card" : "bg-surface"}`}
              style={on ? { background: colorGradient(m.meta.colorKey) } : undefined}
            >
              {on ? <span aria-hidden="true" className="size-8 shrink-0 rounded-[10px] bg-on-card-fill" /> : <FlowBadge m={m} />}
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{m.meta.name}</span>
              <span className="shrink-0 text-right leading-tight">
                <b className="block text-[15px] font-extrabold tabular-nums">{m.headline}</b>
                <small className={`block text-[10px] font-bold ${on ? "text-on-card-muted" : "text-muted"}`}>{m.headlineNote}</small>
              </span>
            </button>
          );
        })}
      </div>

      <p className="flex items-center gap-2 px-1 text-[12.5px] font-semibold text-muted" aria-live="polite">
        <i aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
        {focus === "all" ? (
          <span>
            <b className="text-fg">All five side by side</b>, so the months line up. Click one to look at it on its own.
          </span>
        ) : view.together ? (
          <span>
            <b className="text-fg">One measure.</b> Click <b className="text-fg">All five</b> to put them back together.
          </span>
        ) : (
          <span>
            <b className="text-fg">Over a year, five at once is too much.</b> One measure at a time; <b className="text-fg">All five</b> is back on a shorter period.
          </span>
        )}
      </p>

      {view.empty ? (
        <p className="rounded-[24px] border border-surface-line bg-surface p-6 text-center text-sm text-muted shadow-soft">Nothing recorded in this period yet.</p>
      ) : one ? (
        <MeasureHover view={view}>
        <div data-measure={one.meta.key} style={heatStyle(one.meta.hue)}>
          <SpendHeatmap
            title={view.periodName}
            heading={`${one.meta.name} heatmap`}
            rows={one.focus.rows}
            yearTotals={one.focus.yearTotals}
            peak={one.focus.peak}
            currentMonth={view.currentMonth}
            totalsLabel={view.totalsLabel}
            noData="Nothing"
            legendNoData="Nothing that month"
            legendUpcoming="Still to come"
            empty="Nothing recorded in this period yet."
            tableLabel={`${one.meta.name} by month`}
            footnote={`${one.meta.word.charAt(0).toUpperCase()}${one.meta.word.slice(1)}. A usual month is taken over the months that have ended.`}
          />
          <Link href={one.meta.href} className="mt-2 ml-1 inline-block text-xs font-bold text-muted hover:text-fg">
            Open {one.meta.page} →
          </Link>
        </div>
        </MeasureHover>
      ) : (
        <MeasureHover view={view}>
          <Together view={view} />
        </MeasureHover>
      )}
    </section>
  );
}

/** The five rows side by side over the same months, one card each. */
function Together({ view }: { view: MonthlyView }) {
  const n = view.columns.length;
  const grid: CSSProperties = { gridTemplateColumns: `minmax(150px,210px) repeat(${n}, minmax(46px,1fr)) minmax(120px,156px)` };
  return (
    <div className="-mx-1 overflow-x-auto px-1 pt-2 pb-2">
      <div role="table" aria-label={`Five measures by month, ${view.periodName}`} className="flex w-max min-w-full flex-col gap-3">
        <div role="row" className="grid items-center gap-1.5 px-[23px]" style={grid}>
          <span role="columnheader">
            <span className="sr-only">Measure</span>
          </span>
          {view.columns.map((month, i) => {
            const now = month === view.currentMonth;
            return (
              <span role="columnheader" key={month} className={`text-center text-[10px] font-bold tracking-[0.02em] uppercase ${now ? "text-fg" : "text-muted"}`}>
                {columnLabel(month, i)}
                {now && <span aria-hidden="true" className="ml-1 inline-block size-[5px] rounded-full bg-accent align-middle" />}
              </span>
            );
          })}
          <span role="columnheader" className="text-right text-[10px] font-bold tracking-[0.02em] text-muted uppercase">
            {view.totalsLabel === "Total" ? "In range" : "This year"}
          </span>
        </div>
        {view.measures.map((m) => (
          <div key={m.meta.key} role="row" data-measure={m.meta.key} className="grid items-center gap-1.5 rounded-[24px] border border-surface-line bg-surface px-[22px] py-3.5 shadow-soft" style={{ ...grid, ...heatStyle(m.meta.hue) }}>
            <div role="rowheader" className="flex min-w-0 items-center gap-2.5">
              <FlowBadge m={m} />
              <Link href={m.meta.href} className="min-w-0 leading-tight hover:underline">
                <span className="block truncate text-sm font-bold">{m.meta.name}</span>
                <span className="block truncate text-[11px] font-semibold text-muted">{m.meta.word}</span>
              </Link>
            </div>
            {m.row.map((cell) => (
              <Cell key={cell.month} cell={cell} isPeak={m.summary.peak?.month === cell.month} isCurrent={cell.month === view.currentMonth} noData="Nothing" />
            ))}
            <div role="cell" className="text-right leading-tight">
              <div className="text-sm font-extrabold tabular-nums" title={formatInr(m.summary.total)}>
                {m.summary.total === 0 ? "–" : formatInrCompact(m.summary.total)}
              </div>
              <div className="text-[10px] font-semibold text-muted tabular-nums">{m.summary.total === 0 ? "Nothing" : `avg ${formatInrCompact(m.summary.average)}`}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
