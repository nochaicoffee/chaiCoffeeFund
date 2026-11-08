"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { monthNote, type HoldingRef, type TradeRowView, type TradesListView } from "@/app/investments/trades/tradesView";
import { Select } from "@/components/Select";
import { StatementsSummary } from "@/components/cards/StatementsSummary";
import type { TradeKind } from "@/lib/aggregate/tradeHistory";
import { useTradeForms } from "../TradeForms";
import { HoldingTile, KindBadge } from "./TradeBits";

type Kind = "all" | TradeKind;
type Market = "all" | "IND" | "US";
const STEP = 60;
const CHIP = "inline-flex min-h-9 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-soft";
const PILL = "flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-surface-line bg-surface px-3.5 text-[12.5px] font-bold";
const COLS = "xl:grid-cols-[4.5rem_minmax(0,1.3fr)_5.5rem_minmax(0,1.8fr)_8rem_7rem_8.5rem_1.5rem]";

/**
 * The Trades page's list (T1 Tape): the four tiles for the year picked, then every trade newest first, grouped by month. Kind, India or
 * US, financial year, broker and a search filter it; picking a holding opens its book. A row opens the trade's form (a vest opens both
 * its trades).
 */
export function TradesList({ view, holdings }: { view: TradesListView; holdings: HoldingRef[] }) {
  const [kind, setKind] = useState<Kind>("all");
  const [market, setMarket] = useState<Market>("all");
  const [year, setYear] = useState("");
  const [broker, setBroker] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(STEP);
  const router = useRouter();

  const q = query.trim().toLowerCase();
  const visible = view.rows.filter((r) => (kind === "all" || r.kind === kind) && (market === "all" || r.market === market) && (!year || String(r.fy) === year) && (!broker || r.broker === broker) && (!q || r.search.includes(q)));
  const page = visible.slice(0, shown);
  const months = view.months.filter((m) => page.some((r) => r.month === m.key));
  const markets = new Set(view.rows.map((r) => r.market));
  const tiles = view.tiles[year] ?? view.tiles[""];
  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(STEP); };

  const kindChip = (value: Kind, label: string) => (
    <button key={value} type="button" aria-pressed={kind === value} onClick={() => pick(setKind)(value)} className={CHIP}>
      {label} <span className="text-[11px] font-semibold tabular-nums opacity-70">{view.counts[value]}</span>
    </button>
  );
  const nothing = year && kind !== "all" ? `No ${kind === "sell" ? "sales" : kind === "rsu" ? "RSU vests" : kind === "espp" ? "ESPP purchases" : "buys"} in ${view.years.find((y) => y.value === year)?.label}.` : "Nothing matches. Try another filter or search.";

  return (
    <>
      <StatementsSummary tiles={tiles.map((t) => ({ label: t.label, value: <span className={t.tone === "down" ? "text-negative" : t.tone === "up" ? "text-positive" : ""}>{t.value}</span>, caption: t.caption }))} />
      <section aria-label="Every trade" className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Kind" className="flex gap-1 max-md:max-w-full max-md:overflow-x-auto md:flex-wrap rounded-full bg-fill p-1">
              {kindChip("all", "Everything")}
              {view.counts.buy > 0 && kindChip("buy", "Buys")}
              {view.counts.sell > 0 && kindChip("sell", "Sales")}
              {view.counts.rsu > 0 && kindChip("rsu", "RSU vests")}
              {view.counts.espp > 0 && kindChip("espp", "ESPP")}
            </div>
            {markets.size > 1 && (
              <div role="group" aria-label="Market" className="flex gap-1 rounded-full bg-fill p-1 xl:ml-auto">
                {(["all", "IND", "US"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={market === m} onClick={() => pick(setMarket)(m)} className={CHIP}>
                    {m === "all" ? "India and US" : m === "IND" ? "India" : "US"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view.years.length > 1 && (
              <div role="group" aria-label="Financial year" className="flex gap-1 max-md:max-w-full max-md:overflow-x-auto md:flex-wrap rounded-full bg-fill p-1">
                <button type="button" aria-pressed={year === ""} onClick={() => pick(setYear)("")} className={CHIP}>
                  All years
                </button>
                {view.years.map((y) => (
                  <button key={y.value} type="button" aria-pressed={year === y.value} onClick={() => pick(setYear)(y.value)} className={CHIP}>
                    {y.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
              <Select variant="pill" aria-label="Holding" options={[{ value: "", label: "Every holding" }, ...holdings.map((h) => ({ value: h.id, label: h.soldOut ? `${h.name} · sold out` : h.name }))]} value="" onChange={(id) => id && router.push(`/investments/trades?holding=${encodeURIComponent(id)}`)} className={PILL} />
              {view.brokers.length > 1 && <Select variant="pill" aria-label="Broker" options={[{ value: "", label: "Every broker" }, ...view.brokers.map((b) => ({ value: b, label: b }))]} value={broker} onChange={pick(setBroker)} className={PILL} />}
              <label className="flex min-h-9 min-w-[200px] items-center gap-2 rounded-full border border-surface-line bg-surface px-3.5 text-[12.5px] max-md:w-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="text-muted">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
                <span className="sr-only">Search</span>
                <input type="search" value={query} onChange={(e) => pick(setQuery)(e.target.value)} placeholder="Search a name or symbol" className="min-w-0 flex-1 bg-transparent font-semibold outline-none" />
              </label>
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-bold">{nothing}</p>
            <button type="button" onClick={() => { setKind("all"); setMarket("all"); setYear(""); setBroker(""); setQuery(""); }} className="min-h-9 rounded-full border border-surface-line bg-surface px-4 text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent">
              Clear the filters
            </button>
          </div>
        ) : (
          <div>
            <div className={`hidden gap-3.5 px-1.5 pb-1 text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase xl:grid ${COLS}`}>
              <span>Date</span>
              <span>Holding</span>
              <span>Kind</span>
              <span>Shares and price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Made on sale</span>
              <span>Broker</span>
              <span />
            </div>
            {months.map((m) => (
              <div key={m.key}>
                <div className="flex items-baseline justify-between gap-3 px-1.5 pt-4 pb-2">
                  <h3 className="text-sm font-extrabold">{m.title}</h3>
                  <span className="text-xs font-bold text-muted">{monthNote(visible.filter((r) => r.month === m.key))}</span>
                </div>
                {page.filter((r) => r.month === m.key).map((r) => (
                  <Row key={r.id} row={r} />
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3 text-[11.5px] font-semibold text-muted">
          <span>
            Showing {page.length} of {visible.length}. A US trade shows dollars, with rupees under it at that day&apos;s rate. An RSU vest and the shares sold to cover its tax are one row. A sale shows what it made at average cost.
          </span>
          {visible.length > shown && (
            <button type="button" onClick={() => setShown(shown + STEP)} className="min-h-9 rounded-full bg-fill px-4 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
              Show {Math.min(STEP, visible.length - shown)} more
            </button>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ row: r }: { row: TradeRowView }) {
  const { open } = useTradeForms();
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1.5 rounded-[12px] border-t border-divider px-1.5 py-2.5 hover:bg-fill ${COLS} ${r.problem ? "bg-negative-tint" : ""}`}>
      <span className="text-[13px] font-extrabold max-xl:hidden">
        {r.date}
        <small className="block text-[11px] font-semibold text-muted">{r.weekday}</small>
      </span>
      <Link href={`/investments/trades?holding=${encodeURIComponent(r.holdingId)}`} title={`Every trade in ${r.name}`} className="group flex min-w-0 items-center gap-2.5 rounded-control text-left focus-visible:outline-2 focus-visible:outline-accent">
        <HoldingTile tile={r.tile} colorKey={r.colorKey} />
        <span className="min-w-0">
          <b className="block truncate text-[13px] font-extrabold group-hover:text-accent-text">
            {r.name}
            <span aria-hidden="true" className="ml-1 opacity-0 group-hover:opacity-100">→</span>
          </b>
          <small className="block truncate text-[11px] font-semibold text-muted">
            <span className="xl:hidden">{r.date} · </span>
            {r.sub}
          </small>
        </span>
      </Link>
      <span className="max-xl:col-start-2 max-xl:row-start-1 max-xl:justify-self-end">
        <KindBadge kind={r.kind} label={r.kindLabel} />
      </span>
      <span className="text-xs font-semibold text-muted max-xl:col-span-2">
        {r.problem && <b className="text-negative">{r.problem} · </b>}
        {r.detail}
        <span className="xl:hidden"> · {r.broker}</span>
      </span>
      <span className="text-[13px] font-extrabold tabular-nums xl:text-right">
        {r.amount}
        {r.amountInr && <small className="block text-[11px] font-semibold text-muted">{r.amountInr}</small>}
      </span>
      <span className="text-right text-[13px] font-extrabold tabular-nums">{r.made ? <span className={r.made.tone === "down" ? "text-negative" : "text-positive"}>{r.made.text}</span> : <span className="text-muted max-xl:hidden">·</span>}</span>
      <span className="text-xs font-bold text-muted max-xl:hidden">{r.broker}</span>
      <button type="button" onClick={() => open({ kind: "edit", id: r.id })} aria-label={`Edit ${r.kindLabel}: ${r.name}, ${r.date}`} className="flex size-8 items-center justify-center justify-self-end rounded-full text-muted hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-accent max-xl:col-start-2 max-xl:row-start-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>
  );
}
