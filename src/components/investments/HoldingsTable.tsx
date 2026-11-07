"use client";

import { useState } from "react";
import { holdingGroups, type HoldingTableRow, type Tone } from "@/app/investments/views";
import { WidgetCard } from "../shell/WidgetCard";
import { PlanTag } from "./PlanTag";

const TONE: Record<Tone, string> = { gain: "text-positive", loss: "text-negative", plain: "text-fg" };
const CHIP: Record<Tone, string> = { gain: "bg-accent-tint text-positive", loss: "bg-negative-tint text-negative", plain: "bg-fill text-muted" };
const COLS = "lg:grid-cols-[minmax(0,2.6fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.7fr)_minmax(0,1.2fr)]";

type Filter = "all" | "IND" | "US";
/**
 * What he holds (docs/design/investments.md, L1 Giant): India and the United States each under a heading with their total, every holding with
 * the shares, what he paid a share on average, today's price and move, what it is worth, the gain and its share of the whole. The chips
 * above pick All, India or the US.
 */
export function HoldingsTable({ rows }: { rows: HoldingTableRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = (market: "IND" | "US") => rows.filter((r) => r.market === market).length;
  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${rows.length}` },
    ...(count("IND") > 0 ? [{ key: "IND" as const, label: `India ${count("IND")}` }] : []),
    ...(count("US") > 0 ? [{ key: "US" as const, label: `US ${count("US")}` }] : []),
  ];
  const active = chips.some((c) => c.key === filter) ? filter : "all";
  return (
    <WidgetCard
      label="Holdings"
      title="Holdings"
      note="folded from the trade log · India in rupees, the US in dollars at today's rate"
      right={
        <div role="group" aria-label="Which holdings" className="flex rounded-full bg-fill p-1">
          {chips.map((c) => (
            <button key={c.key} type="button" aria-pressed={active === c.key} onClick={() => setFilter(c.key)} className={`min-h-8 rounded-full px-3.5 text-[12.5px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${active === c.key ? "bg-ink text-on-ink" : "text-muted hover:text-fg"}`}>
              {c.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col">
        <div className={`hidden gap-3.5 pb-2 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:grid ${COLS}`} aria-hidden="true">
          <span>Holding</span>
          <span className="text-right">Quantity</span>
          <span className="text-right">Average cost</span>
          <span className="text-right">Price</span>
          <span className="text-right">Today</span>
          <span className="text-right">Value</span>
          <span className="text-right">Gain</span>
          <span>Share</span>
        </div>
        {holdingGroups(rows).filter((g) => active === "all" || active === g.market).map((g) => {
          return (
            <div key={g.market} role="group" aria-label={g.title}>
              <div className="flex items-baseline justify-between border-b border-divider pt-3.5 pb-1.5 text-[11px] font-extrabold tracking-[0.05em] text-muted uppercase">
                <span>{g.title}</span>
                <b className="text-[12.5px] tracking-normal text-fg normal-case">{g.summary}</b>
              </div>
              {g.rows.map((r) => (
                <Row key={r.key} r={r} />
              ))}
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}

function Row({ r }: { r: HoldingTableRow }) {
  return (
    <div className={`grid items-center gap-x-3.5 gap-y-2 border-b border-divider py-3 last:border-b-0 max-lg:grid-cols-2 ${COLS}`}>
      <div className="flex min-w-0 items-center gap-3 max-lg:col-span-2">
        <span aria-hidden="true" className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] text-[10px] font-extrabold text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${r.colorKey}-from), var(--card-${r.colorKey}-to))` }}>
          {r.tile}
        </span>
        <span className="min-w-0">
          <b className="block text-[13.5px] font-extrabold">
            {r.name}
            {r.tags.map((t) => (
              <PlanTag key={t} name={t} />
            ))}
          </b>
          <span className="block truncate text-[11px] font-semibold text-muted">{r.kind}</span>
        </span>
      </div>
      <Cell label="Quantity"><b>{r.quantity}</b></Cell>
      <Cell label="Average cost">
        <b>{r.avgCost}</b>
        {r.avgCostNote && <small>{r.avgCostNote}</small>}
      </Cell>
      <Cell label="Price">
        <b>{r.price}</b>
        {r.priceNote && <small className={r.price === "No price" || r.priceNote.includes("out of date") ? "text-negative" : undefined}>{r.priceNote}</small>}
      </Cell>
      <Cell label="Today">
        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11.5px] font-extrabold whitespace-nowrap lg:ml-auto ${CHIP[r.dayTone]}`}>{r.day}</span>
        {r.dayInr && <small className={TONE[r.dayInrTone]}>{r.dayInr}</small>}
      </Cell>
      <Cell label="Value">
        <b>{r.worth}</b>
        {r.worthNote && <small>{r.worthNote}</small>}
      </Cell>
      <Cell label="Gain">
        <b className={TONE[r.gainTone]}>{r.gain}</b>
        <small className={TONE[r.gainTone]}>{r.gainNote}</small>
      </Cell>
      <div className="flex min-w-0 flex-col text-[13px] max-lg:col-span-2">
        <span className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:sr-only">Share</span>
        <b className="text-[12.5px]">{r.share}</b>
        <span aria-hidden="true" className="mt-1 block h-2 overflow-hidden rounded-full bg-fill">
          <i className="block h-full rounded-full" style={{ width: `${Math.min(100, r.shareFraction * 250)}%`, background: `var(--card-${r.colorKey})` }} />
        </span>
      </div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col text-[13px] lg:items-end lg:text-right [&_small]:mt-0.5 [&_small]:text-[11px] [&_small]:font-semibold [&_small]:text-muted">
      <span className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:sr-only">{label}</span>
      {children}
    </div>
  );
}
