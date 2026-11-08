"use client";

import Link from "next/link";
import type { BookRowView, BookView, HoldingRef, StepPoint } from "@/app/investments/trades/tradesView";
import { PlanTag } from "../PlanTag";
import { useTradeForms } from "../TradeForms";
import { HoldingTile, KIND_FILL, KindBadge } from "./TradeBits";

const CHIP = "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent";
const COLS = "lg:grid-cols-[7.5rem_6rem_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_1.5rem]";
const SOURCE_FILL = { Market: KIND_FILL.buy, ESPP: KIND_FILL.espp, RSU: KIND_FILL.rsu } as const;
const href = (id: string) => `/investments/trades?holding=${encodeURIComponent(id)}`;

/**
 * The Trades page with one holding picked (T2 Book): the holding chips, its four figures and a step chart of shares held, how its shares
 * came in, then every trade in it with the shares held and the average cost after it.
 */
export function TradeBook({ view, holdings }: { view: BookView; holdings: HoldingRef[] }) {
  const held = holdings.filter((h) => !h.soldOut);
  const soldOut = holdings.filter((h) => h.soldOut);
  return (
    <>
      <nav aria-label="Holdings" className="flex items-center gap-2 overflow-x-auto rounded-[22px] border border-surface-line bg-surface p-2.5 shadow-soft md:flex-wrap md:px-4">
        <Link href="/investments/trades" className={`${CHIP} bg-fill text-fg hover:bg-fill-strong`}>
          ← All trades
        </Link>
        {held.map((h) => <HoldingChip key={h.id} h={h} on={h.id === view.ref.id} />)}
        {soldOut.length > 0 && <span className="ml-1 shrink-0 text-[11px] font-extrabold tracking-[0.05em] text-muted uppercase">Sold out</span>}
        {soldOut.map((h) => <HoldingChip key={h.id} h={h} on={h.id === view.ref.id} />)}
      </nav>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label={`${view.ref.name} at a glance`} className="flex min-w-0 flex-col gap-3.5 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
          <div className="flex items-center gap-3.5">
            <HoldingTile tile={view.ref.tile} colorKey={view.ref.colorKey} size={46} />
            <div className="min-w-0">
              <h2 className="text-[19px] leading-tight font-extrabold">
                {view.ref.name}
                {view.tags.map((t) => (
                  <PlanTag key={t} name={t} />
                ))}
              </h2>
              <p className="text-xs font-semibold text-muted">{view.kindLine}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {view.figures.map((f) => (
              <div key={f.label} className="min-w-0 rounded-[16px] bg-fill px-3.5 py-3">
                <div className="text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase">{f.label}</div>
                <div className="mt-1 truncate text-[19px] font-extrabold tabular-nums">{f.value}</div>
                <div className="mt-0.5 text-[11.5px] font-semibold text-muted">{f.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">
              Shares held<small className="ml-2 text-xs font-semibold text-muted">a step at every trade</small>
            </h3>
            <Legend kinds={[...new Set(view.steps.map((s) => s.kind))]} />
          </div>
          <StepChart steps={view.steps} first={view.firstDate} today={view.today} colorKey={view.ref.colorKey} name={view.ref.name} />
        </section>

        <section aria-label="How the shares came in" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 text-[13px] font-semibold shadow-[var(--card-shadow)] md:p-6">
          <h3 className="text-[15px] font-extrabold">How the shares came in</h3>
          <div className="flex h-4 gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
            {view.cameIn.map((c) => (
              <span key={c.source} style={{ flex: Number(c.quantity), background: SOURCE_FILL[c.source] }} />
            ))}
          </div>
          {view.cameIn.map((c) => (
            <div key={c.source} className="flex justify-between gap-3">
              <span className="flex items-center gap-2"><i className="size-2.5 rounded-[3px]" style={{ background: SOURCE_FILL[c.source] }} />{c.label}</span>
              <b className="tabular-nums">{c.quantity}</b>
            </div>
          ))}
          {view.sold !== "0" ? (
            <div className="flex justify-between gap-3">
              <span className="flex items-center gap-2"><i className="size-2.5 rounded-[3px]" style={{ background: KIND_FILL.sell }} />Sold, and sold to cover tax</span>
              <b className="tabular-nums">−{view.sold}</b>
            </div>
          ) : (
            <p className="text-muted">Nothing sold yet</p>
          )}
          <div className="flex justify-between gap-3 border-t border-divider pt-3 font-extrabold">
            <span>Held today</span>
            <span className="tabular-nums">{view.heldToday}</span>
          </div>
          <div className="mt-1 flex flex-col gap-2.5 border-t border-divider pt-3.5">
            <h3 className="text-sm font-extrabold">
              What a share cost, by how it came<small className="ml-2 text-xs font-semibold text-muted">in rupees, on the day</small>
            </h3>
            {view.costs.map((c) => (
              <div key={c.label} className="flex justify-between gap-3">
                <span>{c.label}</span>
                <b className="tabular-nums">{c.value}</b>
              </div>
            ))}
            {view.priceToday && (
              <div className="flex justify-between gap-3">
                <span>Price today</span>
                <b className="tabular-nums">{view.priceToday}</b>
              </div>
            )}
            {view.average && (
              <div className="flex justify-between gap-3 font-extrabold">
                <span>Average across all</span>
                <span className="tabular-nums">{view.average}</span>
              </div>
            )}
          </div>
          <p className="mt-auto pt-2 text-[11.5px] leading-relaxed text-muted">Average cost is weighted: a sale takes shares at the average, so it never moves the average; a buy does. That&apos;s why it can differ from your broker&apos;s per-lot cost.</p>
        </section>
      </div>

      <section aria-label={`Every trade in ${view.ref.name}`} className="flex min-w-0 flex-col rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <h3 className="text-[15px] font-extrabold">
            Every trade in it<small className="ml-2 text-xs font-semibold text-muted">newest first · shares and average cost after each one</small>
          </h3>
          <Link href="/investments/trades" className="text-[12.5px] font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Back to all trades →
          </Link>
        </div>
        <div className={`hidden gap-3.5 px-1.5 pb-1 text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase lg:grid ${COLS}`}>
          <span>Date</span>
          <span>Kind</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Held after</span>
          <span className="text-right">Average cost after</span>
          <span className="text-right">Made on sale</span>
          <span />
        </div>
        {view.rows.map((r) => (
          <BookRow key={r.id} r={r} name={view.ref.name} />
        ))}
      </section>
    </>
  );
}

function HoldingChip({ h, on }: { h: HoldingRef; on: boolean }) {
  return (
    <Link href={href(h.id)} aria-current={on ? "page" : undefined} className={`${CHIP} ${on ? "bg-ink text-on-ink" : "bg-fill text-fg hover:bg-fill-strong"}`}>
      {h.name}
      <span className="text-[11px] font-semibold tabular-nums opacity-70">{h.count}</span>
    </Link>
  );
}

function Legend({ kinds }: { kinds: StepPoint["kind"][] }) {
  const label = { buy: "Buy", espp: "ESPP", rsu: "RSU vest", sell: "Sell" } as const;
  return (
    <span className="flex flex-wrap gap-3 text-[11.5px] font-bold text-muted">
      {(["buy", "espp", "rsu", "sell"] as const).filter((k) => kinds.includes(k)).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px]" style={{ background: KIND_FILL[k] }} />
          {label[k]}
        </span>
      ))}
    </span>
  );
}

/** Shares held over time: a step at every trade, a dot coloured by its kind (each dot's title says what it was). */
function StepChart({ steps, first, today, colorKey, name }: { steps: StepPoint[]; first: string; today: string; colorKey: string; name: string }) {
  const W = 900, H = 230, ml = 44, mr = 14, mt = 16, mb = 26;
  const t0 = Date.parse(first), t1 = Math.max(Date.parse(today), t0 + 86_400_000);
  const top = Math.max(1, ...steps.map((s) => s.quantity)) * 1.12;
  const x = (iso: string) => ml + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - ml - mr);
  const y = (q: number) => mt + (1 - q / top) * (H - mt - mb);
  let d = `M${x(first).toFixed(1)},${y(0).toFixed(1)}`;
  for (const s of steps) d += ` H${x(s.date).toFixed(1)} V${y(s.quantity).toFixed(1)}`;
  d += ` H${W - mr}`;
  const area = `${d} V${y(0)} H${x(first)} Z`;
  const firstYear = Number(first.slice(0, 4)), lastYear = Number(today.slice(0, 4));
  const years = Array.from({ length: Math.max(0, lastYear - firstYear) }, (_, i) => firstYear + i + 1);
  const ticks = [0, 0.5, 1].map((f) => Math.round((top / 1.12) * f));
  const peak = Math.max(...steps.map((s) => s.quantity));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`Shares of ${name} held from ${steps[0]?.label.split(" · ")[0]} to today, at most ${peak}`} className="overflow-visible">
      <defs>
        <linearGradient id={`held-${colorKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`var(--card-${colorKey})`} stopOpacity="0.32" />
          <stop offset="1" stopColor={`var(--card-${colorKey})`} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((q, i) => (
        <g key={i}>
          <line x1={ml} x2={W - mr} y1={y(q)} y2={y(q)} stroke="var(--divider)" vectorEffect="non-scaling-stroke" />
          <text x={ml - 8} y={y(q) + 4} textAnchor="end" className="fill-muted text-[10px] font-bold">{q}</text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr} x={x(`${yr}-01-01`)} y={H - 6} textAnchor="middle" className="fill-muted text-[10px] font-bold">{yr}</text>
      ))}
      <path d={area} fill={`url(#held-${colorKey})`} />
      <path d={d} fill="none" stroke={`var(--card-${colorKey})`} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      {steps.map((s, i) => (
        <circle key={i} cx={x(s.date)} cy={y(s.quantity)} r="5" fill={KIND_FILL[s.kind]} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke">
          <title>{s.label}</title>
        </circle>
      ))}
    </svg>
  );
}

function BookRow({ r, name }: { r: BookRowView; name: string }) {
  const { open } = useTradeForms();
  const tone = { rise: "text-warning-text", fall: "text-positive", quiet: "text-muted" } as const;
  return (
    <div className={`grid grid-cols-2 items-center gap-x-3.5 gap-y-1 border-t border-divider px-1.5 py-2.5 ${COLS} ${r.problem ? "rounded-[12px] bg-negative-tint" : ""}`}>
      <span className="text-[13px] font-extrabold">{r.date}</span>
      <span className="max-lg:justify-self-end"><KindBadge kind={r.kind} label={r.kindLabel} /></span>
      <Cell label="Shares">
        <b>{r.shares}</b>
        {r.coverShares && <small>{r.coverShares} for tax</small>}
      </Cell>
      <Cell label="Price">
        <b>{r.price}</b>
        {r.priceNote && <small>{r.priceNote}</small>}
      </Cell>
      <Cell label="Amount"><b>{r.amount}</b></Cell>
      <Cell label="Held after">
        <b className="rounded-[8px] bg-fill px-2 py-0.5">{r.heldAfter}</b>
        {r.problem && <small className="font-extrabold text-negative">{r.problem}</small>}
      </Cell>
      <Cell label="Average cost after">
        <b>{r.avgAfter}</b>
        {(r.avgMove || r.avgUsd) && (
          <small>
            {r.avgMove && <span className={`font-extrabold ${tone[r.avgMove.tone]}`}>{r.avgMove.text}</span>}
            {r.avgMove && r.avgUsd && " · "}
            {r.avgUsd}
          </small>
        )}
      </Cell>
      <Cell label="Made on sale">{r.made ? <b className={r.made.tone === "down" ? "text-negative" : "text-positive"}>{r.made.text}</b> : <span className="text-muted">·</span>}</Cell>
      <button type="button" onClick={() => open({ kind: "edit", id: r.id })} aria-label={`Edit ${r.kindLabel}: ${name}, ${r.date}`} className="flex size-8 items-center justify-center justify-self-end rounded-full text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent max-lg:col-span-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col text-[13px] tabular-nums lg:items-end lg:text-right [&_b]:font-extrabold [&_small]:mt-0.5 [&_small]:text-[11px] [&_small]:font-semibold [&_small]:text-muted">
      <span className="text-[10px] font-extrabold tracking-[0.05em] text-muted uppercase lg:hidden">{label}</span>
      {children}
    </div>
  );
}
