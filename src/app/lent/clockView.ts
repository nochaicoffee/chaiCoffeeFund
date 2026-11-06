import { daysBetween } from "@/lib/aggregate/cardSpend";
import { earnedOn, evenDates, missedMarks } from "@/lib/aggregate/lentClock";
import { annualRatePercent, lentLoanColor } from "@/lib/aggregate/lentOut";
import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatMonthShort } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { LentLoan } from "@/lib/sheets/types";
import type { LentModel } from "./views";

/**
 * The interest clock (docs/design/lent-out.md, L2, split in two on 2026-11-07): the clock card (a dial, the day / month / year / all-time
 * switch, and what each loan earns) and the "Interest adding up" card (the 12% pot, the payouts in lumps, and the chart). As plain data:
 * the arcs, the rows and the chart's lines already scaled to 0-1, so the component only draws. The numbers come from lib/aggregate/lentClock.
 */

export const PERIODS = ["day", "month", "year", "all"] as const;
export type ClockPeriod = (typeof PERIODS)[number];

/** Each period has its own colour, and the widget keeps it whatever the hero is showing. */
export const PERIOD_COLOR: Record<ClockPeriod, ColorKey> = { day: "amber", month: "teal", year: "indigo", all: "forest" };

const inr = (n: number) => formatInr(Math.round(n));
const rate = (loan: LentLoan) => `${Number(annualRatePercent(loan).toFixed(1))}%`;

export interface ClockArc {
  key: string;
  colorKey: ColorKey;
  /** Its part of the circle, 0 to 1. */
  fraction: number;
}

export interface ClockRow {
  key: string;
  name: string;
  colorKey: ColorKey;
  note: string;
  amount: string;
  share: string;
  fraction: number;
}

export interface ClockPeriodView {
  id: ClockPeriod;
  label: string;
  /** "a day", "a month", "a year" or "earned so far". */
  unit: string;
  /** "at today's pace", or "since Oct 2024". */
  basis: string;
  /** The big figure in the dial's middle, without its rupee sign. */
  big: string;
  arcs: ClockArc[];
  rows: ClockRow[];
  /** The caption under the rows. */
  note: string;
}

export interface ChartLine {
  key: string;
  colorKey: ColorKey;
  name: string;
  /** [x, y] points from 0 to 1, left to right and bottom to top. */
  points: [number, number][];
  /** The 12% pot carries a dotted projection from today to the chart's end. */
  projection?: [number, number][];
}

export interface ChartMark {
  key: string;
  x: number;
  y: number;
  label: string;
}

export interface ChartView {
  lines: ChartLine[];
  /** The y ticks: where (0 to 1) and what to say. */
  yTicks: { at: number; label: string }[];
  /** The x ticks: the first of each year in view. */
  xTicks: { at: number; label: string }[];
  today: number;
  /** The shaded stretch of the picked period, per period. */
  bands: Record<ClockPeriod, [number, number]>;
  marks: ChartMark[];
  label: string;
}

export interface ClockView {
  periods: Record<ClockPeriod, ClockPeriodView>;
  /** The "Interest adding up" card. */
  pot?: { title: string; amount: string; note: string };
  lumps?: { title: string; amount: string; note: string };
  chart: ChartView;
}

/** A chart's top: the first of 1, 2.5, 5 times a power of ten that holds the highest value, with at most five ticks. */
function niceMax(value: number): { max: number; step: number } {
  for (const pow of [10_000, 100_000, 1_000_000, 10_000_000]) {
    for (const mult of [1, 2.5, 5]) {
      const step = pow * mult;
      const max = Math.ceil(value / step) * step;
      if (max / step <= 5) return { max: Math.max(max, step), step };
    }
  }
  return { max: value, step: value };
}

export function clockView(m: LentModel): ClockView | null {
  const { data, clock, today } = m;
  if (data.loans.length === 0) return null;

  // Day, month and year are what the principal still out earns at today's pace; all time is what has come due, repaid loans included.
  const perDay = new Map(clock.loans.map((c) => [c.loan.id, c.perDay]));
  const earned = new Map(data.loans.map((l) => [l.id, earnedOn(l, data.repayments, m.promises[l.id], today)]));
  const first = data.loans.map((l) => l.startDate).sort()[0];

  const unlinked = data.loans.some((l) => l.interestMode === "Paid-out" && l.status !== "Repaid" && m.promises[l.id] && !m.promises[l.id].linked);
  const build = (id: ClockPeriod): ClockPeriodView => {
    const scale = id === "day" ? 1 : id === "month" ? 365 / 12 : id === "year" ? 365 : 0;
    const loans = id === "all" ? data.loans.filter((l) => (earned.get(l.id) ?? 0) > 0) : clock.loans.map((c) => c.loan);
    const value = (l: LentLoan) => (id === "all" ? (earned.get(l.id) ?? 0) : (perDay.get(l.id) ?? 0) * scale);
    const rowsRaw = loans.map((l) => ({ loan: l, value: value(l) })).sort((a, b) => b.value - a.value || a.loan.id.localeCompare(b.loan.id));
    const total = rowsRaw.reduce((t, r) => t + r.value, 0);
    const top = rowsRaw[0]?.value ?? 0;
    return {
      id,
      label: { day: "A day", month: "A month", year: "A year", all: "All time" }[id],
      unit: { day: "a day", month: "a month", year: "a year", all: "earned so far" }[id],
      basis: id === "all" ? `since ${formatMonthShort(first.slice(0, 7))} ${first.slice(0, 4)}` : "at today's pace",
      big: inr(total).slice(1),
      arcs: rowsRaw.map((r) => ({ key: r.loan.id, colorKey: cardColorKey(lentLoanColor(r.loan)), fraction: total > 0 ? r.value / total : 0 })),
      rows: rowsRaw.map((r) => ({
        key: r.loan.id,
        name: r.loan.borrowerName,
        colorKey: cardColorKey(lentLoanColor(r.loan)),
        note: r.loan.interestMode === "Accruing" ? `${rate(r.loan)} simple · piles up, paid when they pay` : `${rate(r.loan)} a year · ${inr(r.loan.payoutAmount ?? 0)} ${r.loan.payoutFrequency === "Monthly" ? "a month" : r.loan.payoutFrequency === "Quarterly" ? "a quarter" : "a year"}`,
        amount: inr(r.value),
        share: `${total > 0 ? Math.round((r.value / total) * 100) : 0}%`,
        fraction: top > 0 ? r.value / top : 0,
      })),
      note: id === "all" ? `What has really come due: the interest piled up and the payouts promised so far, not what has reached you.${unlinked ? " A payout loan with no income source has no promises to count, so it adds nothing here." : ""}` : "A month is a twelfth of a year, a year is 365 days: what the principal still out earns at its rate.",
    };
  };
  const periods = Object.fromEntries(PERIODS.map((p) => [p, build(p)])) as Record<ClockPeriod, ClockPeriodView>;

  // ---- the chart: from the first loan to two months on, so the 12% pile's projection has room ----
  const end = addMonthsUTC(today, 2);
  const span = Math.max(1, daysBetween(first, end));
  const x = (iso: string) => Math.min(1, Math.max(0, daysBetween(first, iso) / span));
  const sampleDates = evenDates(first, today, 48);
  const lineValues: { loan: LentLoan; pts: { date: string; v: number }[] }[] = data.loans.map((loan) => {
    if (loan.interestMode === "Accruing") {
      // From nothing on the day it was lent, then the sampled days after it.
      const after = sampleDates.filter((d) => d > loan.startDate).map((date) => ({ date, v: earnedOn(loan, data.repayments, undefined, date) }));
      return { loan, pts: [{ date: loan.startDate, v: 0 }, ...after] };
    }
    // A payout loan steps up on each promised day (a Waiting one isn't promised yet).
    const promised = (m.promises[loan.id]?.promises ?? []).filter((p) => p.verdict !== "Waiting");
    const pts: { date: string; v: number }[] = [{ date: loan.startDate, v: 0 }];
    let cum = 0;
    for (const p of promised) {
      pts.push({ date: p.date, v: cum });
      cum += p.amount;
      pts.push({ date: p.date, v: cum });
    }
    pts.push({ date: today, v: cum });
    return { loan, pts };
  });
  const projectionEnd = new Map(
    data.loans.filter((l) => l.interestMode === "Accruing" && (perDay.get(l.id) ?? 0) > 0).map((l) => [l.id, earnedOn(l, data.repayments, undefined, end)]),
  );
  const highest = Math.max(1, ...lineValues.flatMap((l) => l.pts.map((p) => p.v)), ...projectionEnd.values());
  const { max, step } = niceMax(highest);
  const y = (v: number) => Math.min(1, Math.max(0, v / max));
  const lines: ChartLine[] = lineValues.map(({ loan, pts }) => {
    const points = pts.map((p) => [x(p.date), y(p.v)] as [number, number]);
    const projected = projectionEnd.get(loan.id);
    const lastValue = pts[pts.length - 1]?.v ?? 0;
    return { key: loan.id, colorKey: cardColorKey(lentLoanColor(loan)), name: loan.borrowerName, points, ...(projected !== undefined && { projection: [[x(today), y(lastValue)], [x(end), y(projected)]] as [number, number][] }) };
  });
  const yTicks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => ({ at: y(i * step), label: i === 0 ? "₹0" : formatInrCompact(i * step) }));
  const years: number[] = [];
  for (let yr = Number(first.slice(0, 4)) + 1; yr <= Number(end.slice(0, 4)); yr++) years.push(yr);
  const xTicks = years.map((yr) => ({ at: x(`${yr}-01-01`), label: String(yr) }));
  const bands: Record<ClockPeriod, [number, number]> = { day: [x(addDays(today, -1)), x(today)], month: [x(addDays(today, -30)), x(today)], year: [x(addDays(today, -365)), x(today)], all: [0, x(today)] };
  const marks: ChartMark[] = missedMarks(m.promises).map((mark) => {
    const promised = (m.promises[mark.loanId]?.promises ?? []).filter((p) => p.date <= mark.date && p.verdict !== "Waiting").reduce((t, p) => t + p.amount, 0);
    return { key: `${mark.loanId}-${mark.date}`, x: x(mark.date), y: y(promised - mark.amount / 2), label: mark.kind === "Missing" ? "never came" : "not here yet" };
  });

  const accruing = data.loans.filter((l) => l.interestMode === "Accruing" && l.status !== "Repaid");
  const potPaid = m.who.blocks.filter((b) => b.loan.interestMode === "Accruing").reduce((t, b) => t + b.summary.interestPaid, 0);
  return {
    periods,
    ...(clock.pot.owed > 0 && {
      pot: {
        title: accruing.length === 1 ? `The ${rate(accruing[0])} pot, ticking up` : "The pot, ticking up",
        amount: inr(clock.pot.owed),
        note: `+${inr(clock.pot.perDay)} a day · about ₹${clock.pot.perHour.toFixed(2)} an hour · ${potPaid > 0 ? "some" : "none"} of it paid yet`,
      },
    }),
    ...(clock.lumps.promised > 0 && {
      lumps: {
        title: "The payouts, in lumps",
        amount: `${inr(clock.lumps.promised)} promised`,
        note: `${inr(clock.lumps.arrived)} arrived${clock.lumps.notHere > 0 ? ` · ${inr(clock.lumps.notHere)} not here` : ""}`,
      },
    }),
    chart: { lines, yTicks, xTicks, today: x(today), bands, marks, label: `Interest earned, adding up since ${formatMonthShort(first.slice(0, 7))} ${first.slice(0, 4)}` },
  };
}
