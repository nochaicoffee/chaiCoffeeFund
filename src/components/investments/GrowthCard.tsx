"use client";

import { useState } from "react";
import type { GrowthLineView, GrowthView } from "@/app/investments/scenarioViews";
import { WidgetCard } from "../shell/WidgetCard";

const W = 900;
const H = 340;
const ML = 64;
const MR = 104;
const MT = 18;
const MB = 32;
const PW = W - ML - MR;
const PH = H - MT - MB;
const x = (v: number) => ML + v * PW;
const y = (v: number) => MT + PH - v * PH;

const pathOf = (l: GrowthLineView) => l.points.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");

/**
 * Where it could go in ten years (docs/design/investments.md, Understand it): today's worth grown at a yearly return he picks, with nothing
 * added or a fixed amount a month. The return is his assumption: the app has no view on it. Never a forecast.
 */
export function GrowthCard({ view }: { view: GrowthView }) {
  const [rateKey, setRateKey] = useState(view.rates[0].key);
  const [off, setOff] = useState<Set<string>>(new Set());
  const rate = view.rates.find((r) => r.key === rateKey) ?? view.rates[0];
  const toggle = (key: string) => setOff((cur) => { const next = new Set(cur); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const shown = rate.lines.filter((l) => !off.has(l.key));

  return (
    <WidgetCard
      label="Where it could go in ten years"
      title="Where it could go in ten years"
      note="a yearly return YOU assume · not a forecast"
      right={
        <div role="group" aria-label="The yearly return to assume" className="flex rounded-full bg-fill p-1">
          {view.rates.map((r) => (
            <button key={r.key} type="button" aria-pressed={r.key === rate.key} onClick={() => setRateKey(r.key)} className={`min-h-8 rounded-full px-3 text-[12px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${r.key === rate.key ? "bg-ink text-on-ink" : "text-muted hover:text-fg"}`}>
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      <div role="group" aria-label="Lines to show" className="flex flex-wrap gap-2">
        {rate.lines.map((l) => (
          <button key={l.key} type="button" aria-pressed={!off.has(l.key)} onClick={() => toggle(l.key)} className={`flex min-h-8 items-center gap-2 rounded-full px-3 text-[12px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 ${off.has(l.key) ? "bg-fill text-muted" : "bg-fill"}`}>
            <i aria-hidden="true" className="block size-2.5 rounded-[3px]" style={{ background: off.has(l.key) ? "transparent" : l.colour, border: `2px solid ${l.colour}` }} />
            {l.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-label={`Today's ${view.start} at ${rate.label}: ${shown.map((l) => `${l.label}, ${l.end} after ten years`).join("; ")}`}>
        {rate.yTicks.map((t) => (
          <g key={t.label}>
            <line x1={ML} x2={ML + PW} y1={y(t.at)} y2={y(t.at)} stroke="var(--divider)" />
            <text x={ML - 8} y={y(t.at) + 4} textAnchor="end" className="fill-muted text-[11px] font-semibold">{t.label}</text>
          </g>
        ))}
        {view.years.map((t, i) => (
          <text key={t.label} x={x(t.at)} y={H - 8} textAnchor={i === 0 ? "start" : i === view.years.length - 1 ? "end" : "middle"} className="fill-muted text-[11px] font-semibold">{t.label}</text>
        ))}
        {shown.map((l) => (
          <g key={l.key}>
            <path d={pathOf(l)} fill="none" stroke={l.colour} strokeWidth={l.bold ? 3 : 2.2} strokeLinejoin="round" />
            <rect x={ML + PW + 6} y={y(l.endY) - 10} width={88} height={20} rx={10} fill={l.colour} />
            <text x={ML + PW + 50} y={y(l.endY) + 4} textAnchor="middle" className="fill-white text-[11px] font-extrabold">{l.end}</text>
          </g>
        ))}
      </svg>

      <dl className="flex flex-col gap-1.5 text-[13px]">
        {shown.map((l) => (
          <div key={l.key} className="flex items-baseline justify-between gap-3">
            <dt className="flex items-center gap-2 font-semibold"><i aria-hidden="true" className="block size-2.5 rounded-full" style={{ background: l.colour }} />{l.label}</dt>
            <dd className="text-right font-extrabold">
              {l.end}
              {l.added && <small className="ml-1.5 font-semibold text-muted">{l.added}</small>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs font-semibold text-muted">{view.note}</p>
    </WidgetCard>
  );
}
