import { daysBetween } from "@/lib/aggregate/cardSpend";
import { evenDates, interestSeries } from "@/lib/aggregate/lentClock";
import { annualRatePercent, lentLoanColor } from "@/lib/aggregate/lentOut";
import type { PayoutVerdict } from "@/lib/aggregate/lentPromises";
import { MAP_BLOCKS_MAX } from "@/lib/aggregate/lentWho";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { LentLoan } from "@/lib/sheets/types";
import type { LentModel } from "./views";

/**
 * The Who owes what hero (docs/design/lent-out.md, L3), as plain, already-formatted data: a block per loan still out (or a scrolling list
 * past three borrowers), a strip for the repaid ones, and the pane each pick opens: Everyone, or "if this one didn't pay back". The numbers
 * come from lib/aggregate/lentWho; nothing here works anything out that isn't shown.
 */

export const ALL = "all";

const inr = (n: number) => formatInr(Math.round(n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (n: number, d: number, digits = 0) => (d > 0 ? `${((n / d) * 100).toFixed(digits)}%` : "0%");
const rate = (loan: LentLoan) => `${Number(annualRatePercent(loan).toFixed(1))}%`;
const every = (loan: LentLoan) => (loan.payoutFrequency === "Monthly" ? "a month" : loan.payoutFrequency === "Quarterly" ? "a quarter" : "a year");

export interface HeroBlock {
  id: string;
  name: string;
  colorKey: ColorKey;
  /** "12% simple · 766 days out", or "₹6,000 a month · 24% a year". */
  terms: string;
  owed: string;
  /** Its share of the total, "62.8%". */
  share: string;
  /** 0 to 1, against the biggest: the bar of a list row. */
  barFraction: number;
  /** "₹6,50,000 principal + ₹1,63,693 interest · ₹2,00,000 came back", or "principal · interest is income". */
  composition: string;
  /** An Accruing loan's principal still out, the part that came back, and the interest owed, as fractions of their sum. */
  meter?: { principal: number; back: number; owed: number };
  /** An Accruing loan's interest piling up: what to say, and the ramp's points (0 to 1) from the day it was lent. */
  pile?: { text: string; ramp: number[] };
  /** A linked payout loan: each promised payout's verdict, oldest first, and what isn't here. */
  promises?: { verdicts: PayoutVerdict[]; notHere?: string };
}

export interface HeroRepaid {
  id: string;
  name: string;
  colorKey: ColorKey;
  note: string;
}

export interface HeroTile {
  label: string;
  value: string;
  note: string;
}

export interface HeroRow {
  key: string;
  name: string;
  colorKey: ColorKey;
  note: string;
  amount: string;
  /** How much of the total would remain, "37%". */
  remaining: string;
}

export interface HeroPane {
  id: string;
  /** The colour the stage takes: the loan's, or Everyone's. */
  colorKey: ColorKey;
  eyebrow: string;
  title: string;
  /** The big figure, without its rupee sign. */
  big: string;
  sub: string;
  chips: string[];
  /** Everyone: without each, in turn. */
  rows: HeroRow[];
  rowsNote?: string;
  /** A loan: how much would remain, and the bar. */
  without?: { now: string; keepFraction: number; stillOut: string; gone: string; goneLabel: string };
  tiles: HeroTile[];
  note: string;
}

export interface HeroView {
  blocks: HeroBlock[];
  asList: boolean;
  /** The note under the list: how many are out and repaid. */
  listNote?: string;
  repaid: HeroRepaid[];
  panes: Record<string, HeroPane>;
  /** Everyone, then each loan still out: the picks. */
  keys: string[];
  title: string;
  sub: string;
}

const EVERYONE: ColorKey = "sapphire";

export function heroView(m: LentModel): HeroView | null {
  const { who, today } = m;
  if (who.blocks.length === 0) return null;
  const biggest = who.blocks[0].owedToday;

  const blocks: HeroBlock[] = who.blocks.map((b, i) => {
    const loan = b.loan;
    const accruing = loan.interestMode === "Accruing";
    const back = loan.principalAmount - b.summary.principalOutstanding;
    const sum = loan.principalAmount + b.summary.interestOwed;
    const p = m.promises[loan.id];
    const block: HeroBlock = {
      id: loan.id,
      name: loan.borrowerName,
      colorKey: cardColorKey(lentLoanColor(loan)),
      terms: accruing ? `${rate(loan)} simple · ${plural(daysBetween(loan.startDate, today), "day", "days")} out` : `${inr(loan.payoutAmount ?? 0)} ${every(loan)} · ${rate(loan)} a year`,
      owed: inr(b.owedToday),
      share: pct(b.owedToday, who.total, 1),
      barFraction: biggest > 0 ? b.owedToday / biggest : 0,
      composition: accruing ? `${inr(b.summary.principalOutstanding)} principal + ${inr(b.summary.interestOwed)} interest${back > 0 ? ` · ${inr(back)} came back` : ""}` : "principal · interest is income",
    };
    if (accruing) {
      block.meter = { principal: b.summary.principalOutstanding / sum, back: back / sum, owed: b.summary.interestOwed / sum };
      // The biggest accruing loan carries the ramp of its interest piling up.
      if (i === who.blocks.findIndex((x) => x.loan.interestMode === "Accruing") && b.summary.interestAccrued > 0) {
        const series = interestSeries([loan], m.data.repayments, {}, evenDates(loan.startDate, today, 12));
        const top = series[series.length - 1]?.total || 1;
        block.pile = {
          text: `Interest piling up since ${`${formatMonthShort(loan.startDate.slice(0, 7))} ${loan.startDate.slice(0, 4)}`}: ${inr(b.perDay)} a day, ${b.summary.interestPaid > 0 ? "some" : "none"} of it paid`,
          ramp: series.map((s) => s.total / top),
        };
      }
    } else if (p?.linked) {
      block.promises = { verdicts: p.promises.map((x) => x.verdict), ...(p.notHere > 0 && { notHere: `${inr(p.notHere)} not here` }) };
    }
    return block;
  });

  const repaid: HeroRepaid[] = who.repaid.map((loan) => ({
    id: loan.id,
    name: loan.borrowerName,
    colorKey: cardColorKey(lentLoanColor(loan)),
    note: `${loan.closedDate ? `repaid ${formatShortDate(loan.closedDate)} · ` : ""}${inr(loan.principalAmount)} lent · owes ₹0`,
  }));

  const asList = who.asList;
  const top3 = who.blocks.slice(0, MAP_BLOCKS_MAX);
  const row = (b: (typeof who.blocks)[number]): HeroRow => ({ key: b.loan.id, name: `Without ${b.loan.borrowerName}`, colorKey: cardColorKey(lentLoanColor(b.loan)), note: `${inr(b.owedToday)} out of the picture`, amount: inr(b.totalWithout), remaining: pct(b.totalWithout, who.total) });

  const panes: Record<string, HeroPane> = {
    [ALL]: {
      id: ALL,
      colorKey: EVERYONE,
      eyebrow: "Everyone",
      title: "Who owes what",
      big: inr(who.total).slice(1),
      sub: `owed today, across ${plural(who.blocks.length, "loan", "loans")}${who.repaid.length > 0 ? ` · ${who.repaid.length} repaid` : ""}`,
      chips: asList
        ? [`Biggest ${pct(who.blocks[0].owedToday, who.total, 1)} · ${who.blocks[0].loan.borrowerName}`, `Top three hold ${pct(top3.reduce((t, b) => t + b.owedToday, 0), who.total)}`, `Earning ${inr(who.perDay)} a day`]
        : [`Biggest ${pct(who.blocks[0].owedToday, who.total, 1)} with one loan`, `Earning ${inr(who.perDay)} a day`],
      rows: top3.map(row),
      rowsNote: asList ? "the three biggest · pick a row for the rest" : "pick a block to open one",
      tiles: [],
      note: "The percent is how much of today's total would remain. It's a size check, never advice.",
    },
  };
  for (const b of who.blocks) {
    const others = who.blocks.filter((x) => x !== b);
    panes[b.loan.id] = {
      id: b.loan.id,
      colorKey: cardColorKey(lentLoanColor(b.loan)),
      eyebrow: "If this one didn't pay back",
      title: `If ${b.loan.borrowerName} didn't pay back`,
      big: inr(b.totalWithout).slice(1),
      sub: others.length === 0 ? "nothing would still be out" : `would still be out with ${others.length <= 3 ? others.map((x) => x.loan.borrowerName).join(" and ") : `${others.length} others`}`,
      chips: [],
      rows: [],
      without: { now: inr(who.total), keepFraction: who.total > 0 ? b.totalWithout / who.total : 0, stillOut: `${inr(b.totalWithout)} still out`, gone: inr(b.owedToday), goneLabel: `${b.loan.borrowerName} owes${b.loan.interestMode === "Accruing" ? ": the principal and its interest" : ""}` },
      tiles: [
        { label: "You'd have lent out", value: inr(b.totalWithout), note: `across ${plural(others.length, "loan", "loans")}` },
        { label: "Out of the total", value: pct(b.owedToday, who.total), note: `${inr(b.owedToday)} of ${inr(who.total)}` },
        { label: "Earning a day", value: inr(b.perDayWithout), note: `down from ${inr(who.perDay)}` },
        { label: "Net worth's Lent out line", value: inr(b.totalWithout), note: `from ${inr(who.total)}` },
      ],
      note: "A measure of how much rides on one borrower, not a forecast. No loan has a date its principal is due, so none can be late; what can be late is a payout, shown beside what is owed.",
    };
  }

  return {
    blocks,
    asList,
    listNote: asList ? `${who.blocks.length} still out, ${who.repaid.length} repaid · scroll for the rest, longest first` : undefined,
    repaid,
    panes,
    keys: [ALL, ...who.blocks.map((b) => b.loan.id)],
    title: "Who owes what",
    sub: "each block is a borrower, sized by what they owe today. Pick one to see the total without it",
  };
}
