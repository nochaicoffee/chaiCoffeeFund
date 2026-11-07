"use client";

import { useState } from "react";
import type { WhatIfView } from "@/app/investments/scenarioViews";
import { WidgetCard } from "../shell/WidgetCard";

const TONE = { gain: "text-positive", loss: "text-negative", plain: "text-muted" } as const;

function Tile({ tile, colorKey }: { tile: string; colorKey: string }) {
  return (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-[8px] text-[8px] font-extrabold text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${colorKey}-from), var(--card-${colorKey}-to))` }}>
      {tile}
    </span>
  );
}

/**
 * What if (docs/design/investments.md, Understand it): today, or one shock to prices, and what it would do to the total and to each holding.
 * Prices only: nothing sold, nothing added. A what-if, never a forecast or a suggestion.
 */
export function WhatIfCard({ view }: { view: WhatIfView }) {
  const [picked, setPick] = useState<string>("today");
  const scenario = view.scenarios.find((s) => s.key === picked);
  // A pick that is no longer on offer (the data changed under it) is Today.
  const pick = scenario ? picked : "today";
  const chip = (key: string, label: string) => (
    <button key={key} type="button" aria-pressed={pick === key} onClick={() => setPick(key)} className={`min-h-8 rounded-full px-3 text-[12px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${pick === key ? "bg-ink text-on-ink" : "text-muted hover:text-fg"}`}>
      {label}
    </button>
  );

  return (
    <WidgetCard
      label="What if"
      title="What if"
      note="a what-if, not a forecast"
      right={
        <div role="group" aria-label="Pick a what-if" className="flex max-w-full flex-wrap rounded-[18px] bg-fill p-1">
          {chip("today", "Today")}
          {view.scenarios.map((s) => chip(s.key, s.label))}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div aria-live="polite">
            <small className="block text-xs font-bold text-muted">{scenario ? `If ${scenario.label}` : "Today"}</small>
            <b className="block text-[34px] leading-tight font-extrabold">{scenario ? scenario.total : view.today.total}</b>
            <span className={`block text-[13px] font-extrabold ${scenario ? TONE[scenario.changeTone] : "text-muted"}`}>{scenario ? scenario.change : "pick a what-if above"}</span>
          </div>
          <p className="max-w-[16rem] text-right text-xs font-semibold text-muted">
            {scenario ? (
              <>
                {scenario.ofGain && <b className="block text-[15px] font-extrabold text-fg">{scenario.ofGain}</b>}
                {scenario.still}
              </>
            ) : (
              view.today.gainLine
            )}
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {scenario
            ? scenario.rows.map((r) => (
                <li key={r.key} className="grid grid-cols-[24px_3.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 text-[13px]">
                  <Tile tile={r.tile} colorKey={r.colorKey} />
                  <b className="truncate font-extrabold">{r.symbol}</b>
                  <span className="relative h-2.5 rounded-full bg-fill" aria-hidden="true">
                    <i className="absolute inset-y-0 left-1/2 w-px bg-divider" />
                    {r.bar !== 0 && <i className="absolute inset-y-0 rounded-full" style={{ background: r.bar < 0 ? "var(--negative)" : "var(--positive)", ...(r.bar < 0 ? { right: "50%", width: `${-r.bar * 50}%` } : { left: "50%", width: `${r.bar * 50}%` }) }} />}
                  </span>
                  <span className={`text-right font-extrabold ${TONE[r.changeTone]}`}>{r.change}</span>
                </li>
              ))
            : view.today.rows.map((r) => (
                <li key={r.key} className="grid grid-cols-[24px_3.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 text-[13px]">
                  <Tile tile={r.tile} colorKey={r.colorKey} />
                  <b className="truncate font-extrabold">{r.symbol}</b>
                  <span className="h-2.5 rounded-full bg-fill" aria-hidden="true">
                    <i className="block h-full rounded-full" style={{ width: `${Math.min(100, r.bar * 100)}%`, background: `var(--card-${r.colorKey})` }} />
                  </span>
                  <span className="text-right font-extrabold">{r.share}</span>
                </li>
              ))}
        </ul>
      </div>
      <p className="text-xs font-semibold text-muted">
        {scenario ? `${scenario.why.charAt(0).toUpperCase()}${scenario.why.slice(1)}. ` : "Bars are each holding's share today. "}
        Prices only: nothing sold, nothing added. Pick a what-if to see how each holding would move.
      </p>
    </WidgetCard>
  );
}
