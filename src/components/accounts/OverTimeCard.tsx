"use client";

import { useState } from "react";
import type { BridgeStep, OverTimeMonth, PickDetail } from "@/app/accounts/detailView";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { Segmented } from "../subscriptions/Segmented";
import { useSize } from "../subscriptions/useSize";

type View = "line" | "river" | "bridge";

/**
 * Over time (docs/design/accounts.md): the glow line first, month-end balance with each month's
 * change as bars under it; then River (every account stacked, All only) and Bridge (the period
 * from where it started to where it ends, step by step). Follows the pick and the period. The
 * Flow map from the design isn't built.
 */
export function OverTimeCard({ detail }: { detail: PickDetail }) {
  const [view, setView] = useState<View>("line");
  const { months, bridge, river } = detail.overTime;
  const shown: View = view === "river" && !river ? "line" : view;
  const options = [{ value: "line" as const, label: "Glow line" }, ...(river ? [{ value: "river" as const, label: "River" }] : []), { value: "bridge" as const, label: "Bridge" }];
  const [box, size] = useSize<HTMLDivElement>({ w: 900, h: 280 });
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="Over time">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          Over time <small className="ml-2 text-xs font-semibold text-muted">{detail.periodName}</small>
        </h2>
        <Segmented label="Chart" value={shown} onChange={setView} options={options} />
      </div>
      <div ref={box} className="h-[280px] w-full">
        {months.length < 2 ? (
          <p className="flex h-full items-center justify-center text-sm font-semibold text-muted">Two months of balances draw this chart.</p>
        ) : shown === "line" ? (
          <GlowLine months={months} w={size.w} h={size.h} />
        ) : shown === "river" ? (
          <River months={months} w={size.w} h={size.h} />
        ) : (
          <Bridge steps={bridge} w={size.w} h={size.h} />
        )}
      </div>
    </section>
  );
}

const PAD = { l: 8, r: 8, t: 16, b: 22 };

function GlowLine({ months, w, h }: { months: OverTimeMonth[]; w: number; h: number }) {
  const barsH = 64;
  const lineH = h - barsH - PAD.t - PAD.b;
  const lo = Math.min(...months.map((m) => m.total));
  const hi = Math.max(...months.map((m) => m.total));
  const x = (i: number) => PAD.l + (i / (months.length - 1)) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (hi === lo ? lineH / 2 : (1 - (v - lo) / (hi - lo)) * lineH);
  const d = months.map((m, i) => `${i ? "L" : "M"} ${x(i)} ${y(m.total)}`).join(" ");
  const peak = Math.max(1, ...months.map((m) => Math.abs(m.change)));
  const mid = h - PAD.b - barsH / 2;
  const slot = (w - PAD.l - PAD.r) / months.length;
  return (
    <svg width={w} height={h} role="img" aria-label={`Month-end balance from ${formatInrCompact(months[0].total)} to ${formatInrCompact(months.at(-1)!.total)}`}>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="8" strokeOpacity="0.2" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {months.map((m, i) => (
        <g key={m.key}>
          <circle cx={x(i)} cy={y(m.total)} r="3.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
            <title>{`${m.label}: ${formatInr(m.total)}`}</title>
          </circle>
          <rect x={PAD.l + i * slot + slot * 0.25} width={slot * 0.5} y={m.change >= 0 ? mid - (m.change / peak) * (barsH / 2) : mid} height={Math.max(1, (Math.abs(m.change) / peak) * (barsH / 2))} rx="3" fill={m.change >= 0 ? "var(--heat-4)" : "var(--negative)"} fillOpacity={m.change >= 0 ? 1 : 0.75}>
            <title>{`${m.label}: ${m.change >= 0 ? "+" : "−"}${formatInr(Math.abs(m.change))}`}</title>
          </rect>
          <text x={PAD.l + i * slot + slot / 2} y={h - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--muted)">
            {m.label}
          </text>
        </g>
      ))}
      <line x1={PAD.l} x2={w - PAD.r} y1={mid} y2={mid} stroke="var(--divider)" />
    </svg>
  );
}

function River({ months, w, h }: { months: OverTimeMonth[]; w: number; h: number }) {
  const ids = [...new Map(months.flatMap((m) => m.parts).map((p) => [p.id, p])).values()];
  const top = Math.max(1, ...months.map((m) => m.total));
  const innerH = h - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (months.length - 1)) * (w - PAD.l - PAD.r);
  const base = (i: number, upto: number) => months[i].parts.slice(0, upto).reduce((s, p) => s + p.balance, 0);
  const y = (v: number) => PAD.t + (1 - v / top) * innerH;
  return (
    <svg width={w} height={h} role="img" aria-label="Every account's balance stacked over the months">
      {ids.map((account) => {
        const at = (i: number, lower: boolean) => {
          const order = months[i].parts.findIndex((p) => p.id === account.id);
          const idx = order < 0 ? months[i].parts.length : order;
          const lowV = base(i, idx);
          const highV = order < 0 ? lowV : lowV + months[i].parts[order].balance;
          return y(lower ? lowV : highV);
        };
        const upper = months.map((_, i) => `${i ? "L" : "M"} ${x(i)} ${at(i, false)}`).join(" ");
        const lower = [...months.keys()].reverse().map((i) => `L ${x(i)} ${at(i, true)}`).join(" ");
        return (
          <path key={account.id} d={`${upper} ${lower} Z`} fill={`var(--card-${account.color})`} fillOpacity="0.9" stroke="var(--surface)" strokeWidth="1">
            <title>{account.name}</title>
          </path>
        );
      })}
      {months.map((m, i) => (
        <text key={m.key} x={x(i)} y={h - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--muted)">
          {m.label}
        </text>
      ))}
    </svg>
  );
}

function Bridge({ steps, w, h }: { steps: BridgeStep[]; w: number; h: number }) {
  // Running level after each step; totals stand on the floor.
  const bars = steps.reduce<{ s: BridgeStep; lo: number; hi: number; level: number }[]>((acc, s) => {
    const before = acc.at(-1)?.level ?? 0;
    const from = s.kind === "total" ? 0 : before;
    const to = s.kind === "total" ? s.amount : before + s.amount;
    return [...acc, { s, lo: Math.min(from, to), hi: Math.max(from, to), level: to }];
  }, []);
  const top = Math.max(1, ...bars.map((b) => b.hi));
  const bottom = Math.min(0, ...bars.map((b) => b.lo));
  const innerH = h - PAD.t - PAD.b - 18;
  const slot = (w - PAD.l - PAD.r) / steps.length;
  const y = (v: number) => PAD.t + 14 + (1 - (v - bottom) / (top - bottom)) * innerH;
  return (
    <svg width={w} height={h} role="img" aria-label="From the start of the period to now, step by step">
      {bars.map(({ s, lo, hi }, i) => {
        const fill = s.kind === "total" ? "var(--heat-5)" : s.kind === "up" ? "var(--heat-3)" : "var(--negative)";
        return (
          <g key={s.label}>
            <rect x={PAD.l + i * slot + slot * 0.18} width={slot * 0.64} y={y(hi)} height={Math.max(2, y(lo) - y(hi))} rx="5" fill={fill} fillOpacity={s.worked ? 0.55 : 1} stroke={s.worked ? fill : "none"} strokeDasharray={s.worked ? "4 3" : undefined}>
              <title>{`${s.label}: ${s.text}${s.worked ? " (worked out: what your records don't explain)" : ""}`}</title>
            </rect>
            <text x={PAD.l + i * slot + slot / 2} y={y(hi) - 5} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--fg)">
              {s.kind === "total" ? formatInrCompact(s.amount) : `${s.amount > 0 ? "+" : "−"}${formatInrCompact(Math.abs(s.amount))}`}
            </text>
            <text x={PAD.l + i * slot + slot / 2} y={h - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--muted)">
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
