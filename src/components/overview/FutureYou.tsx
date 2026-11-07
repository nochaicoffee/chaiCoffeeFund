"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { FutureView } from "@/app/overview/futureView";
import { RollingNumber } from "@/components/motion/RollingNumber";
import { futureAt, futureMilestones, projectFuture, type FutureAssumptions } from "@/lib/aggregate/futureYou";
import { formatMonthYear } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";

const HORIZONS = [1, 3, 5, 10, 20];
const STORE = "overview.futureYou.v1";
const W = 900;
const H = 300;
const PAD = { l: 58, r: 22, t: 28, b: 40 };

const monthLabel = (startMonth: string, month: number) => {
  const total = Number(startMonth.slice(0, 4)) * 12 + Number(startMonth.slice(5, 7)) - 1 + month;
  return formatMonthYear(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`);
};
/** A round gridline step (1, 2 or 5 times a power of ten, in crore) that gives about five lines, and a top that is a whole number of them. */
const niceStep = (v: number) => { const raw = v / 5; const pow = 10 ** Math.floor(Math.log10(raw)); const n = raw / pow; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow; };
const niceMax = (v: number) => { const step = Math.max(10_000_000, niceStep(v)); return Math.max(step, Math.ceil((v * 1.05) / step) * step); };
const cr = (v: number) => (v === 0 ? "₹0" : `₹${v / 10_000_000} Cr`);

/**
 * Future you (docs/design/overview.md, OvT1): what net worth could be in 1 to 20 years if investments earn a rate you set (any rate, by slider or
 * typed) and the amounts you add stay as set. Arithmetic on your records and on numbers you can change; the ones that came from your records say
 * where from, and what you change is remembered on this device.
 */
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); window.addEventListener("storage", cb); return () => { listeners.delete(cb); window.removeEventListener("storage", cb); }; };
const readSaved = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
const writeSaved = (value: string | null) => {
  try { if (value === null) localStorage.removeItem(STORE); else localStorage.setItem(STORE, value); } catch { /* not remembered; it still works */ }
  listeners.forEach((l) => l());
};

export function FutureYou({ view }: { view: FutureView }) {
  const [years, setYears] = useState(10);
  // What was changed last time on this device (nothing on the server, so the page first shows what the records say).
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const a = useMemo<FutureAssumptions>(() => {
    try { return { ...view.defaults, ...(saved ? (JSON.parse(saved) as Partial<FutureAssumptions>) : {}) }; } catch { return view.defaults; }
  }, [saved, view.defaults]);
  // The return's text while it is being typed, so a half-typed "1." isn't snapped back.
  const [draft, setDraft] = useState<string | null>(null);
  const typed = draft ?? String(a.returnPct);
  const change = (patch: Partial<FutureAssumptions>) => writeSaved(JSON.stringify({ ...a, ...patch }));
  const setRate = (value: number) => { setDraft(null); change({ returnPct: Math.min(30, Math.max(0, value)) }); };

  const points = useMemo(() => projectFuture(view.start, a), [view.start, a]);
  const at = useMemo(() => futureAt(points, view.start, a, years), [points, view.start, a, years]);
  const marks = useMemo(() => futureMilestones(points, view.start, view.loanNames), [points, view.start, view.loanNames]);
  const ymax = niceMax(Math.max(...points.map((p) => p.net)));
  const x = (month: number) => PAD.l + (month / 240) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.max(0, v) / ymax) * (H - PAD.t - PAD.b);
  const base = y(0);
  const step = Math.max(10_000_000, niceStep(ymax));
  const sampled = points.filter((p) => p.month % 3 === 0);
  const line = sampled.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)},${y(p.net).toFixed(1)}`).join("");
  const owedArea = `M${x(0)},${base}${sampled.map((p) => `L${x(p.month).toFixed(1)},${y(p.owed).toFixed(1)}`).join("")}L${x(240)},${base}Z`;
  const p = at.point;

  return (
    <section aria-label="Future you" className="grid gap-6 rounded-[26px] p-5 text-on-card md:p-8 xl:grid-cols-[300px_minmax(0,1fr)]" style={{ background: "linear-gradient(140deg, var(--card-teal-from), var(--card-teal-to))" }}>
      <div className="flex flex-col gap-3">
        <div className="text-xs font-extrabold tracking-[0.06em] uppercase opacity-80">Future you</div>
        <h2 className="text-[22px] leading-tight font-extrabold">What you&apos;ll be worth, and when</h2>
        <div className="mt-2 text-xs font-extrabold tracking-[0.05em] uppercase opacity-75">In</div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="How far ahead">
          {HORIZONS.map((h) => (
            <button key={h} type="button" aria-pressed={years === h} onClick={() => setYears(h)} className={`min-h-9 rounded-full px-4 text-[13px] font-extrabold focus-visible:outline-2 focus-visible:outline-on-card ${years === h ? "bg-white text-black" : "bg-on-card-fill hover:bg-white/25"}`}>
              {h} <small className="font-bold opacity-70">{h === 1 ? "year" : "years"}</small>
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs font-extrabold tracking-[0.05em] uppercase opacity-75">If your investments earn</div>
        <div className="flex items-baseline justify-between gap-3">
          <label className="flex items-center gap-1.5 text-[28px] font-extrabold">
            <span className="sr-only">Yearly return, in percent</span>
            <input type="number" inputMode="decimal" min={0} max={30} step={0.5} value={typed} onChange={(e) => { setDraft(e.target.value); const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n) && n >= 0 && n <= 30) change({ returnPct: n }); }} onBlur={() => setDraft(null)} className="w-20 rounded-lg bg-on-card-fill px-2 py-0.5 text-[28px] font-extrabold tabular-nums focus-visible:outline-2 focus-visible:outline-on-card" />%
          </label>
          <small className="text-[13px] font-bold opacity-75">a year</small>
        </div>
        <input type="range" min={2} max={14} step={1} value={Math.min(14, Math.max(2, Math.round(a.returnPct)))} onChange={(e) => setRate(Number(e.target.value))} aria-label="Yearly return, by slider" className="w-full accent-white" />
        <div className="flex justify-between text-[10.5px] font-bold opacity-70" aria-hidden="true">{Array.from({ length: 13 }, (_, i) => i + 2).map((n) => <span key={n}>{n}</span>)}</div>
        <div className="mt-auto rounded-[18px] bg-on-card-fill p-4 text-xs font-semibold">
          <b className="block text-[13px] font-extrabold">What it assumes (change any)</b>
          <ul className="mt-2 flex flex-col gap-2">
            {view.notes.map((n) => (
              <li key={n.key}>
                <label className="flex items-center justify-between gap-2">
                  <span>{n.label}</span>
                  <span className="flex items-center gap-1">
                    {n.key.endsWith("Pct") ? null : <span aria-hidden="true">₹</span>}
                    <input type="number" min={0} step={n.key.endsWith("Pct") ? 0.25 : 1000} value={a[n.key]} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0) change({ [n.key]: v } as Partial<FutureAssumptions>); }} className="w-24 rounded-md bg-on-card-fill px-1.5 py-0.5 text-right font-extrabold tabular-nums" />
                    {n.key.endsWith("Pct") ? <span aria-hidden="true">%</span> : null}
                  </span>
                </label>
                <small className="block opacity-70">{n.assumed ? "Assumed" : "From your records"}: {n.source}</small>
              </li>
            ))}
          </ul>
          <small className="mt-2 block opacity-75">Loans are paid by their EMIs only. Your bank, what you&apos;ve lent and card bills stay as they are today. Arithmetic on these numbers, not a forecast.</small>
          <button type="button" onClick={() => { setDraft(null); writeSaved(null); }} className="mt-2 text-[12px] font-extrabold underline underline-offset-4">Back to what your records say</button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-[0.06em] uppercase opacity-80">In {years} {years === 1 ? "year" : "years"} · {monthLabel(view.startMonth, years * 12)}</div>
          <div className="mt-1 text-[clamp(34px,6vw,64px)] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums"><RollingNumber value={Math.round(p.net)} format="inr" /></div>
          <p className="mt-2 text-sm font-semibold opacity-90">is what you&apos;d be worth if your investments earn {a.returnPct}% a year. That is {at.change >= 0 ? "+" : "−"}{formatInrCompact(Math.abs(at.change))} on today.</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Tile k="From investment growth" v={`${at.fromGrowth >= 0 ? "+" : "−"}${formatInrCompact(Math.abs(at.fromGrowth))}`} s={`what ${a.returnPct}% adds over standing still`} />
          <Tile k="From everything else" v={`${at.fromEverythingElse >= 0 ? "+" : "−"}${formatInrCompact(Math.abs(at.fromEverythingElse))}`} s="what you add, deposits and EPF, loans paid down" />
          <Tile k="Investments then" v={formatInrCompact(p.investments)} s={`from ${formatInrCompact(view.start.investments)} today`} />
          <Tile k="Still owed then" v={p.owed > 0 ? formatInrCompact(p.owed) : "₹0"} s={p.loans > 0 ? "loans and cards" : view.start.cards > 0 ? "loans are gone; cards remain" : "nothing"} />
        </div>
        <div className="rounded-[22px] bg-on-card-fill p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Net worth over twenty years at ${a.returnPct}% a year`}>
            {Array.from({ length: Math.round(ymax / step) + 1 }, (_, i) => i * step).map((v) => (
              <g key={v}><line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity={v ? 0.13 : 0.3} strokeDasharray={v ? "3 5" : undefined} /><text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#fff" fillOpacity={0.65}>{cr(v)}</text></g>
            ))}
            {[0, 60, 120, 180, 240].map((m) => <text key={m} x={x(m)} y={base + 18} textAnchor="middle" fontSize={11} fill="#fff" fillOpacity={0.65}>{m === 0 ? "Today" : monthLabel(view.startMonth, m).slice(-4)}</text>)}
            <path d={owedArea} fill="oklch(0.7 0.18 25)" fillOpacity={0.38} />
            <path d={`${line}L${x(240)},${base}L${x(0)},${base}Z`} fill="#fff" fillOpacity={0.13} />
            <path d={line} fill="none" stroke="#fff" strokeWidth={3.2} strokeLinejoin="round" />
            {HORIZONS.map((h) => { const pt = points[h * 12]; const sel = h === years; return (
              <g key={h} className="cursor-pointer" onClick={() => setYears(h)}>
                <line x1={x(pt.month)} x2={x(pt.month)} y1={y(pt.net)} y2={base} stroke="#fff" strokeOpacity={sel ? 0.9 : 0.35} strokeDasharray="3 4" />
                <circle cx={x(pt.month)} cy={y(pt.net)} r={sel ? 8 : 5} fill="#fff" stroke="var(--card-teal)" strokeWidth={sel ? 4 : 3} />
                {(sel || h === 20) && <text x={x(pt.month) - (h === 20 ? 12 : 0)} y={y(pt.net) - 14} textAnchor={h === 20 ? "end" : "middle"} fontSize={13} fontWeight={800} fill="#fff">{formatInrCompact(pt.net)}</text>}
              </g>
            ); })}
          </svg>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 px-1 text-[11.5px] font-bold opacity-85">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3.5 rounded-[3px] bg-[oklch(0.7_0.18_25_/_0.7)]" />What you owe, shrinking as the loans clear</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3.5 rounded-[3px] bg-white" />Your net worth</span>
          </div>
        </div>
        {marks.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Milestones">
            {marks.map((mk) => <li key={`${mk.month}${mk.label}`} className="rounded-full bg-on-card-fill px-3 py-1 text-xs font-bold">{mk.label} · {monthLabel(view.startMonth, mk.month)}</li>)}
          </ul>
        )}
        <span className="sr-only">{formatInr(Math.round(p.net))}</span>
      </div>
    </section>
  );
}

function Tile({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="rounded-[16px] bg-on-card-fill px-3.5 py-3">
      <div className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase opacity-75">{k}</div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums">{v}</div>
      <div className="text-[11.5px] font-semibold opacity-75">{s}</div>
    </div>
  );
}
