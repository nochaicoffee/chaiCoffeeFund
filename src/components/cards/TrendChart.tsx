"use client";

import { useState, type ReactNode } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { heatLevel } from "@/lib/aggregate/cardSpend";
import { trendWindow, type TrendPoint, type TrendRange } from "@/lib/aggregate/cardTrend";
import type { CardColor } from "@/lib/sheets/types";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { cardSwatch } from "./CardTile";

export interface TrendCard {
  id: string;
  name: string;
  color?: CardColor;
}

const RANGES: TrendRange[] = ["All", "1Y", "6M", "3M"];

function Toggle({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-7 min-w-[34px] items-center justify-center rounded-full px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent max-md:h-9 ${
        pressed ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The design's statement trend: monthly statement totals as bars and/or a line,
 * by card (stacked in card colours) or in total (shaded like the heatmap), with
 * the average, the peak and the current month marked.
 */
export function TrendChart({ points, cards, currentMonth }: { points: TrendPoint[]; cards: TrendCard[]; currentMonth: string }) {
  const [mode, setMode] = useState<"card" | "total">("total");
  const [bars, setBars] = useState(true);
  const [line, setLine] = useState(false);
  const [range, setRange] = useState<TrendRange>("1Y");

  const { points: shown, average, peak } = trendWindow(points, range);
  // Says which months the average covers, so it isn't mistaken for the greeting's year-to-date average.
  const averageLabel =
    range === "All"
      ? `Average since ${formatMonthYear(shown[0]?.month ?? currentMonth)}`
      : `${{ "3M": "3-month", "6M": "6-month", "1Y": "12-month" }[range]} average`;
  const max = Math.max(0, ...shown.map((p) => p.total));
  const spansYears = new Set(shown.map((p) => p.month.slice(0, 4))).size > 1;
  const latest = shown.at(-1);
  const shownCards = cards.filter((c) => shown.some((p) => (p.byCard[c.id] ?? 0) > 0) || cards.length === 1);

  // At least one of bars and line stays on, so the chart never goes blank.
  const toggleBars = () => setBars((on) => (on && !line ? on : !on));
  const toggleLine = () => setLine((on) => (on && !bars ? on : !on));

  return (
    <section aria-labelledby="trend-heading" className="flex flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-[22px] shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
          <h2 id="trend-heading" className="text-sm font-bold text-fg">
            Statement trend
          </h2>
          {mode === "total" ? (
            <div className="flex flex-wrap items-center gap-[7px] text-[11px] text-muted" aria-hidden="true">
              Low
              {[1, 2, 3, 4, 5].map((l) => (
                <span key={l} className="inline-block size-3 rounded-[4px]" style={{ background: `var(--heat-${l})` }} />
              ))}
              High
              <span className="ml-3 inline-block w-[18px] border-t-[1.5px] border-dashed border-heat-4" />
              {averageLabel} {formatInrCompact(average)}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
              {shownCards.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="size-[9px] rounded-[3px]" style={{ background: cardSwatch(c.color) }} aria-hidden="true" />
                  {c.name}
                  <span className="font-semibold text-muted">{formatInrCompact(latest?.byCard[c.id] ?? 0)}</span>
                </span>
              ))}
              {latest && <span className="text-[10px] text-muted">{formatMonthYear(latest.month).split(" ")[0]}</span>}
              <span className="text-[10px] text-muted">
                · {averageLabel} {formatInrCompact(average)}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-fill p-[3px]" role="group" aria-label="Show">
            <Toggle pressed={mode === "card"} onClick={() => setMode("card")}>
              By card
            </Toggle>
            <Toggle pressed={mode === "total"} onClick={() => setMode("total")}>
              Total
            </Toggle>
          </div>
          <div className="flex rounded-full bg-fill p-[3px]" role="group" aria-label="Chart type">
            <Toggle pressed={line} onClick={toggleLine} label="Line">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 17 9 11 13 15 21 7" />
              </svg>
            </Toggle>
            <Toggle pressed={bars} onClick={toggleBars} label="Bars">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="6" y1="20" x2="6" y2="11" />
                <line x1="12" y1="20" x2="12" y2="5" />
                <line x1="18" y1="20" x2="18" y2="14" />
              </svg>
            </Toggle>
          </div>
          <div className="flex items-center gap-0.5" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`rounded-full px-[13px] py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent max-md:py-2.5 ${
                  range === r ? "bg-accent-tint text-accent-text" : "text-muted hover:text-fg"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {max === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No spending in this range yet.</p>
      ) : (
        <div className="h-[280px] w-full" role="img" aria-label={`Monthly statement totals, ${shown.map((p) => `${formatMonthYear(p.month)} ${formatInr(p.total)}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={shown} margin={{ top: 28, right: 28, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--divider)" />
              <XAxis
                dataKey="month"
                // The current month's label is set in bold ink with a dot, instead of a second floating label that could collide with the peak's.
                tick={(props) => {
                  const { x, y, payload } = props as { x: number | string; y: number | string; payload: { value: string } };
                  const month = String(payload.value);
                  const isCurrent = month === currentMonth;
                  const text = `${spansYears && month.endsWith("-01") ? `Jan ${month.slice(2, 4)}` : formatMonthShort(month)}${isCurrent ? " •" : ""}`;
                  return (
                    <text x={Number(x)} y={Number(y) + 12} textAnchor="middle" fontSize={11} fontWeight={isCurrent ? 800 : 600} fill={isCurrent ? "var(--fg)" : "var(--muted)"}>
                      {text}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis tickFormatter={(v: number) => formatInrCompact(v)} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip
                cursor={{ fill: "var(--fill)" }}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--surface-line)", borderRadius: 12, boxShadow: "var(--soft-shadow)", fontSize: 12 }}
                labelStyle={{ color: "var(--fg)", fontWeight: 700 }}
                itemStyle={{ color: "var(--fg)" }}
                labelFormatter={(m) => formatMonthYear(String(m))}
                formatter={(value, name) => [formatInr(Number(value)), String(name)]}
              />
              {bars &&
                (mode === "total" ? (
                  <Bar dataKey="total" name="Total" radius={[8, 8, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                    {shown.map((p) => (
                      <Cell key={p.month} fill={p.total > 0 ? `var(--heat-${heatLevel(p.total, max)})` : "transparent"} />
                    ))}
                  </Bar>
                ) : (
                  shownCards.map((c, i) => (
                    <Bar
                      key={c.id}
                      dataKey={(p: TrendPoint) => p.byCard[c.id] ?? 0}
                      name={c.name}
                      stackId="cards"
                      fill={cardSwatch(c.color)}
                      radius={i === shownCards.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                      maxBarSize={56}
                      isAnimationActive={false}
                    />
                  ))
                ))}
              {line && (
                <Line type="monotone" dataKey="total" name="Total" tooltipType={bars ? "none" : undefined} stroke="var(--accent-text)" strokeWidth={2} dot={{ r: 3, fill: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
              )}
              <ReferenceLine y={average} stroke="var(--heat-4)" strokeOpacity={0.6} strokeDasharray="5 4" ifOverflow="extendDomain" />
              {peak && (
                <ReferenceDot
                  x={peak.month}
                  y={peak.amount}
                  r={0}
                  label={{ value: `Peak ${formatInrCompact(peak.amount)}`, position: "top", fill: "var(--fg)", fontSize: 11, fontWeight: 800 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
