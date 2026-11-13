"use client";

import { useState } from "react";
import type { MoneyMonth, PickDetail } from "@/app/accounts/detailView";
import type { MoneyShare, ShareKind } from "@/app/accounts/moneyShares";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { RingTexture } from "../RingTexture";

type Which = "in" | "spent" | "invested" | "left";
const WHICH: Which[] = ["in", "spent", "invested", "left"];

/** One coloured part of a month's column. `hatch` marks money that is worked out from the balances, not recorded. */
interface Part {
  name: string;
  value: number;
  color: string;
  hatch?: boolean;
}

const COLOR = {
  cameIn: "var(--accent)",
  borrowed: "var(--card-ocean)",
  held: "var(--card-aubergine)",
  cardBills: "var(--card-ruby)",
  emis: "var(--card-copper)",
  bigSpends: "var(--card-magenta)",
  subscriptions: "var(--card-coral)",
  cashUpi: "var(--card-sky)",
  sent: "var(--card-violet)",
  takenBack: "var(--card-teal)",
  grew: "var(--card-emerald)",
  fell: "var(--negative)",
};

/** A share's colour: income is a green ramp by its place in the list, the rest follow the month columns' colours. */
const INCOME_RAMP = ["var(--accent)", "color-mix(in oklab, var(--accent) 70%, white)", "color-mix(in oklab, var(--accent) 45%, white)", "color-mix(in oklab, var(--accent) 28%, white)"];
const SHARE_COLOR: Record<Exclude<ShareKind, "income">, string> = {
  borrowed: COLOR.borrowed,
  held: COLOR.held,
  cardBills: COLOR.cardBills,
  emis: COLOR.emis,
  bigSpends: COLOR.bigSpends,
  subscriptions: COLOR.subscriptions,
  cashUpi: COLOR.cashUpi,
  sentLoan: COLOR.sent,
  sentOwn: "color-mix(in oklab, var(--card-violet) 55%, white)",
  takenBack: COLOR.takenBack,
  lent: "var(--card-amber)",
  returned: "var(--card-bronze)",
};
const shareColor = (sh: MoneyShare, index: number) => (sh.kind === "income" ? INCOME_RAMP[Math.min(index, INCOME_RAMP.length - 1)] : SHARE_COLOR[sh.kind]);

const hatched = (c: string) => `repeating-linear-gradient(135deg, ${c} 0 5px, color-mix(in oklab, ${c} 50%, white) 5px 10px)`;

/** The parts above the line and below it for one month, by what the picked answer is about. */
function partsOf(which: Which, m: MoneyMonth): { up: Part[]; down: Part[]; total: number } {
  const cashOut = Math.max(0, -m.cashUpi);
  switch (which) {
    case "in":
      return { up: [{ name: "Came in", value: m.cameIn, color: COLOR.cameIn }, { name: "Borrowed", value: m.borrowed, color: COLOR.borrowed }, { name: "Held for others", value: m.held, color: COLOR.held }], down: [], total: m.cameIn };
    case "spent": {
      const up: Part[] = [
        { name: "Card bills", value: m.cardBills, color: COLOR.cardBills },
        { name: "EMIs", value: m.emis, color: COLOR.emis },
        { name: "Big spends", value: m.bigSpends, color: COLOR.bigSpends },
        { name: "Subscriptions", value: m.subscriptions, color: COLOR.subscriptions },
        { name: "Cash and UPI", value: cashOut, color: COLOR.cashUpi, hatch: true },
      ];
      // A month the balances rose by more than the records explain (money moved between accounts, a refund) hangs below the line, so the
      // months add up to the tile, which nets those months off against the ones that fell short.
      return { up, down: [{ name: "Came in with no record", value: Math.max(0, m.cashUpi), color: COLOR.grew, hatch: true }], total: up.reduce((t, p) => t + p.value, 0) };
    }
    case "invested":
      return { up: [{ name: "Sent to brokers", value: m.sent, color: COLOR.sent }], down: [{ name: "Back from brokers", value: m.takenBack, color: COLOR.takenBack }], total: m.sent - m.takenBack };
    case "left":
      return { up: [{ name: "Grew", value: Math.max(0, m.left), color: COLOR.grew }], down: [{ name: "Fell", value: Math.max(0, -m.left), color: COLOR.fell }], total: m.left };
  }
}

const NOTE: Record<Which, string> = {
  in: "Income in green. A loan paid in has its own colour: it is owed back, so it is never counted as income.",
  spent: "Card bills, EMIs, big spends and subscriptions are recorded. Cash and UPI is what the balances say left with no record: worked out. Below the line, a month more came in than the records explain; the tile nets those off.",
  invested: "Sent to brokers above the line, what they sent back below it.",
  left: "Each month's change in what your bank accounts hold, from their recorded balances: above the line they grew, below it they fell.",
};

const TITLE: Record<Which, string> = {
  in: "What came in",
  spent: "What you spent",
  invested: "What you invested",
  left: "How the bank balance changed",
};

const H = 190;

/** One bar split by a tile's shares, so its proportions can be read at a glance. */
function ShareBar({ shares }: { shares: MoneyShare[] }) {
  // The money coming back from brokers is a row, not a slice of what was sent.
  const parts = shares.filter((sh) => sh.kind !== "takenBack");
  const total = parts.reduce((t, sh) => t + sh.value, 0);
  if (total <= 0) return null;
  return (
    <div aria-hidden="true" className="mt-3 flex h-2 w-full gap-px overflow-hidden rounded-full">
      {parts.map((sh, k) => (
        <i key={sh.name} className="block h-full min-w-[3px]" style={{ width: `${(sh.value / total) * 100}%`, background: sh.kind === "cashUpi" ? hatched(shareColor(sh, k)) : shareColor(sh, k) }} />
      ))}
    </div>
  );
}

/** The card a month column opens on hover or focus: the month, its total, each part with its colour, and what the figure is. */
function MonthCard({ name, total, parts, foot, side }: { name: string; total: string; parts: Part[]; foot: string; side: "left" | "right" }) {
  return (
    <span role="tooltip" className={`pointer-events-none absolute top-2 z-20 hidden w-56 flex-col gap-1.5 rounded-2xl border border-surface-line bg-surface p-3 text-left shadow-[var(--card-shadow)] group-focus-within:flex group-hover:flex ${side === "left" ? "left-0" : "right-0"}`}>
      <span className="flex items-baseline justify-between gap-2">
        <b className="text-xs font-extrabold">{name}</b>
        <b className="text-sm font-extrabold tabular-nums">{total}</b>
      </span>
      {parts.map((p) => (
        <span key={p.name} className="flex items-center gap-2 text-[11px] font-semibold">
          <i aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: p.hatch ? hatched(p.color) : p.color }} />
          <span className="flex-1 text-muted">{p.name}</span>
          <b className="tabular-nums">{formatInr(p.value)}</b>
        </span>
      ))}
      <span className="text-[11px] font-semibold text-muted">{foot}</span>
    </span>
  );
}

const CARD_FOOT: Record<Which, string> = {
  in: "Income only; a loan paid in is apart",
  spent: "Hatched is worked out from the balances",
  invested: "Sent less what came back",
  left: "Change in what the banks held",
};

/**
 * The money section (docs/design/accounts.md, "The money section", picked as M2 "Four answers"): what came in, what was spent, what
 * was invested and what was left in the bank, as four tiles for the period, and under them the months behind whichever one is open.
 * Money borrowed is never income, and cash and UPI is drawn hatched: the balances moved by it but nothing records it.
 */
export function MoneySection({ detail }: { detail: PickDetail }) {
  const [which, setWhich] = useState<Which>("spent");
  const { months } = detail;
  const columns = months.map((m) => ({ m, ...partsOf(which, m) }));
  const top = Math.max(1, ...columns.map((c) => c.up.reduce((t, p) => t + p.value, 0)));
  const bottom = Math.max(0, ...columns.map((c) => c.down.reduce((t, p) => t + p.value, 0)));
  const upH = bottom > 0 ? H * (top / (top + bottom)) : H;
  const downH = H - upH;
  const legend = [...new Map(columns.flatMap((c) => [...c.up, ...c.down]).filter((p) => p.value > 0).map((p) => [p.name, p])).values()];

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="Money in and out">
      <h2 className="text-[15px] font-extrabold">
        {detail.periodName}, in four answers <small className="ml-2 text-xs font-semibold text-muted">Pick one to see its months. Worked out from your records and balances</small>
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="The four answers">
        {detail.answers.map((a, i) => {
          const open = WHICH[i] === which;
          const feature = i === 3 && a.tone === "positive";
          return (
            <button
              key={a.label}
              type="button"
              aria-pressed={open}
              onClick={() => setWhich(WHICH[i])}
              className={`relative isolate h-full cursor-pointer overflow-hidden rounded-[18px] p-4 text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none ${feature ? "border border-feature-tile-line bg-feature-tile" : "bg-fill"} ${open ? "shadow-[0_0_0_2.5px_var(--surface),0_0_0_5px_var(--ink)]" : ""}`}
            >
              <RingTexture width={200} height={100} dx={6} dy={10} first={30} step={22} stroke="var(--rings-ink)" opacity={feature ? 0.16 : 0.1} />
              <div className="text-xs font-semibold text-muted">{a.label}</div>
              <div className={`mt-1 text-[22px] font-extrabold tabular-nums whitespace-nowrap md:text-[30px] ${a.tone === "negative" ? "text-negative" : ""}`}>{a.value}</div>
              {a.note && <div className="mt-0.5 text-[11px] font-semibold text-muted">{a.note}</div>}
              {i < 3 && a.shares.length > 0 && <ShareBar shares={a.shares} />}
              {a.shares.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {a.shares.map((sh, k) => (
                    <li key={sh.name} className="flex items-center gap-2 text-[11px] font-semibold">
                      <i aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: sh.kind === "cashUpi" ? hatched(shareColor(sh, k)) : shareColor(sh, k) }} />
                      <span className="min-w-0 flex-1 text-muted">{sh.name}</span>
                      <b className="tabular-nums text-ink">{sh.text}</b>
                    </li>
                  ))}
                </ul>
              )}
              {a.footnote && <div className="mt-2 text-[11px] font-semibold text-muted">{a.footnote}</div>}
            </button>
          );
        })}
      </div>
      {!detail.hasFlows ? (
        <p className="py-6 text-center text-sm font-semibold text-muted">Nothing is recorded against this account in {detail.periodName.toLowerCase()}, so there are no months to show.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">{TITLE[which]}, month by month</h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
              {legend.map((p) => (
                <li key={p.name} className="inline-flex items-center gap-1.5">
                  <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: p.hatch ? hatched(p.color) : p.color }} />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-x-auto pb-1">
            <ul className="grid items-end gap-1.5" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(44px, 1fr))`, minWidth: columns.length * 52 }} aria-label={`${TITLE[which]}, by month`}>
              {columns.map((c, idx) => {
                const parts = [...c.up, ...c.down].filter((p) => p.value > 0);
                const label = which === "left" ? `${c.total >= 0 ? "+" : "−"}${formatInr(Math.abs(c.total))}` : formatInr(c.total);
                return (
                  <li key={c.m.key} tabIndex={0} aria-label={`${c.m.name}: ${label}. ${parts.map((p) => `${p.name} ${formatInr(p.value)}`).join(", ")}`} className="group relative flex flex-col items-center gap-1 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-accent">
                    <MonthCard name={c.m.name} total={label} parts={parts} foot={CARD_FOOT[which]} side={idx < columns.length / 2 ? "left" : "right"} />
                    <span className="flex w-full items-end justify-center" style={{ height: upH }}>
                      <span className="flex w-[62%] flex-col-reverse gap-px overflow-hidden rounded-[8px]">
                        {c.up.filter((p) => p.value > 0).map((p) => (
                          <i key={p.name} className="block w-full" style={{ height: Math.max(2, (p.value / top) * upH), background: p.hatch ? hatched(p.color) : p.color }} />
                        ))}
                      </span>
                    </span>
                    {bottom > 0 && (
                      <span className="flex w-full items-start justify-center border-t border-divider" style={{ height: downH }}>
                        <span className="flex w-[62%] flex-col gap-px overflow-hidden rounded-[8px]">
                          {c.down.filter((p) => p.value > 0).map((p) => (
                            <i key={p.name} className="block w-full" style={{ height: Math.max(2, (p.value / bottom) * downH), background: p.hatch ? hatched(p.color) : p.color }} />
                          ))}
                        </span>
                      </span>
                    )}
                    <b className="text-xs font-extrabold">{c.m.label}</b>
                    <span className={`text-[11px] font-extrabold tabular-nums ${which === "left" ? (c.total < 0 ? "text-negative" : c.total > 0 ? "text-positive" : "text-muted") : "text-muted"}`}>
                      {which === "left" ? `${c.total >= 0 ? "+" : "−"}${formatInrCompact(Math.abs(c.total))}` : formatInrCompact(c.total)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs font-semibold text-muted">{NOTE[which]}</p>
        </div>
      )}
    </section>
  );
}
