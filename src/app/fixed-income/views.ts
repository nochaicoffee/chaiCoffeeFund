import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { financialYearOf, financialYearStart } from "@/lib/aggregate/epf";
import { builtUpSeries, depositBars, epfBars, expectedAtMaturity, type BuiltUpPoint, type DepositBar, type EpfBar, type FixedIncome, type FixedIncomeInput } from "@/lib/aggregate/fixedIncome";
import type { ColorKey } from "@/lib/format/colors";
import { formatDate, formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { FixedDeposit } from "@/lib/sheets/types";

/**
 * What the Fixed Income page shows (docs/design/fixed-income.md, J1), as plain, already-formatted data: the greeting's sentence and
 * the cards its figures point at, the attention strip, the three doors and what each door's stage says. The numbers come from
 * lib/aggregate/fixedIncome.ts; nothing here works anything out that isn't shown.
 */

export type DoorId = "all" | "epf" | "fd";
export const DOORS: readonly DoorId[] = ["all", "epf", "fd"];
export const DOOR_COLOR: Record<DoorId, ColorKey> = { all: "sapphire", epf: "emerald", fd: "teal" };

/** ₹10.76L with two decimals, as the design sets the big figures: lakhs from a lakh, crores from a crore, plain rupees below. */
export function lakhParts(value: number): { amount: string; unit: string } {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e7) return { amount: `${sign}${(abs / 1e7).toFixed(2)}`, unit: "Cr" };
  if (abs >= 1e5) return { amount: `${sign}${(abs / 1e5).toFixed(2)}`, unit: "L" };
  return { amount: formatInr(value).replace("₹", ""), unit: "" };
}
export function formatLakh(value: number): string {
  const { amount, unit } = lakhParts(value);
  return `₹${amount}${unit}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const monthsPhrase = (months: number) => (months < 1 ? "this month" : months < 24 ? `in ${plural(months, "month", "months")}` : `in ${(months / 12).toFixed(1)} years`);
const approx = (n: number) => `≈ ${formatInr(Math.round(n))}`;
const rupees = (n: number) => formatInr(Math.round(n));
const addMonthKey = (month: string, n: number): string => {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + n);
  return date.toISOString().slice(0, 7);
};
const expectedLine = (d: FixedDeposit): string => {
  const e = expectedAtMaturity(d);
  return `${rupees(e.amount)}${e.estimate ? ", an estimate" : ""}`;
};

export type FixedIncomeData = FixedIncomeInput;

// ---------- The greeting ----------
export type FixedIncomePoint = "total" | "epf" | "deposits" | "perDay" | "interest" | "next";
export interface GreetingCard {
  title: string;
  total: string;
  rows: GreetingRowData[];
  note?: string;
}
export type FixedIncomeGreetingCards = Partial<Record<FixedIncomePoint, GreetingCard>>;

export function summarySentence(f: FixedIncome): SentencePart[] {
  const hasEpf = f.epf.total > 0;
  const hasDeposits = f.deposits.held.length > 0;
  if (!hasEpf && !hasDeposits) return [{ text: "Nothing here yet. Add an EPF statement or a deposit, and this page shows what you hold, what it earns and when it matures." }];
  const parts: SentencePart[] = [{ text: "Your fixed income is worth " }, { text: formatLakh(f.total), strong: true, point: "total" }];
  if (hasEpf && hasDeposits) {
    parts.push({ text: ": EPF " }, { text: formatLakh(f.epf.total), strong: true, point: "epf" }, { text: " and " }, { text: `${plural(f.deposits.held.length, "deposit", "deposits")} ${formatLakh(f.deposits.worth)}`, strong: true, point: "deposits" });
  } else if (hasEpf) {
    parts.push({ text: ", all of it EPF" });
  } else {
    parts.push({ text: ", all of it " }, { text: plural(f.deposits.held.length, "deposit", "deposits"), strong: true, point: "deposits" });
  }
  if (f.perDay > 0) parts.push({ text: ", earning about " }, { text: `${rupees(f.perDay)} a day`, strong: true, point: "perDay" });
  parts.push({ text: ". " });
  if (f.epf.estimate > 0) parts.push({ text: "EPF has " }, { text: `about ${rupees(f.epf.estimate)}`, strong: true, point: "interest" }, { text: " of this year's interest built up and not yet credited. " });
  if (f.deposits.nextMaturity) parts.push({ text: "The next deposit matures " }, { text: monthsPhrase(f.deposits.nextMaturity.months), strong: true, point: "next" }, { text: "." });
  else if (f.deposits.due.length > 0) parts.push({ text: `${plural(f.deposits.due.length, "deposit has", "deposits have")} matured and is ` }, { text: "waiting to be closed", strong: true }, { text: "." });
  return parts;
}

const row = (key: string, name: string, colorKey: string, amount: string, note?: string, fraction?: number): GreetingRowData => ({ key, name, colorKey, amount, note, fraction });

export function greetingView(f: FixedIncome, today: string): FixedIncomeGreetingCards {
  const cards: FixedIncomeGreetingCards = {};
  const holding = f.epf.holdings[0];
  if (f.total > 0) {
    cards.total = {
      title: "What it is worth today",
      total: formatLakh(f.total),
      rows: [
        ...(f.epf.total > 0 ? [row("epf", "EPF", DOOR_COLOR.epf, formatLakh(f.epf.total), "as the passbook says", f.epf.total / f.total)] : []),
        ...(f.deposits.held.length > 0 ? [row("fd", "Deposits", DOOR_COLOR.fd, formatLakh(f.deposits.worth), `${plural(f.deposits.held.length, "deposit", "deposits")}, an estimate`, f.deposits.worth / f.total)] : []),
      ],
      note: `You put in ${formatLakh(f.putIn)}; ${rupees(f.earned)} of it is interest earned so far.`,
    };
  }
  if (holding && f.epf.total > 0) {
    cards.epf = {
      title: "EPF, as the passbook says",
      total: formatLakh(f.epf.total),
      rows: [row("emp", "Employee", DOOR_COLOR.epf, formatInr(f.epf.employee)), row("er", "Employer", DOOR_COLOR.epf, formatInr(f.epf.employer)), row("eps", "Pension (EPS)", "slate", formatInr(f.epf.pension), "earns no interest here")],
      note: holding.confirmedThrough ? `Confirmed by a passbook printed ${formatDate(holding.confirmedThrough)}.` : "No passbook imported yet.",
    };
  }
  if (f.deposits.held.length > 0) {
    cards.deposits = {
      title: "Deposits you hold",
      total: formatLakh(f.deposits.worth),
      rows: f.deposits.held.slice(0, 7).map((d) => row(d.id, d.name, DOOR_COLOR.fd, rupees(f.deposits.worthOf[d.id]), `matures ${formatDate(d.maturityDate)}`)),
      note: `${rupees(f.deposits.accrued)} built up on ${formatInr(f.deposits.placed)} placed. Worth today is an estimate until you add the bank's own figures.`,
    };
  }
  if (f.perDay > 0) {
    const depositsPerDay = f.perDay - f.epf.perDay;
    cards.perDay = {
      title: "What it earns at today's rates",
      total: `${rupees(f.perDay)} a day`,
      rows: [
        ...(f.epf.perDay > 0 ? [row("epf", "EPF", DOOR_COLOR.epf, `${rupees(f.epf.perDay)} a day`, holding?.ratePercent ? `${holding.ratePercent}% on the passbook balance` : undefined)] : []),
        ...(depositsPerDay > 0 ? [row("fd", "Deposits", DOOR_COLOR.fd, `${rupees(depositsPerDay)} a day`, "at each one's own rate")] : []),
      ],
      note: `About ${rupees(f.perMonth)} a month. Not a forecast: it is today's balance at today's rates.`,
    };
  }
  if (f.epf.estimate > 0 && holding?.ratePercent) {
    const first = financialYearStart(financialYearOf(today)).slice(0, 7);
    cards.interest = {
      title: "EPF interest, not credited yet",
      total: approx(f.epf.estimate),
      rows: [
        row("rate", "Rate used", DOOR_COLOR.epf, `${holding.ratePercent}%`, holding.rateSource === "Declared" ? "declared by EPFO" : "assumed: the latest known, until EPFO declares it"),
        row("months", "Months counted", DOOR_COLOR.epf, String(holding.estimate.months), `${formatMonthShort(first)} to ${formatMonthShort(addMonthKey(first, holding.estimate.months - 1))}`),
        ...(holding.lastInterest ? [row("last", "Credited last year", DOOR_COLOR.epf, formatInr(holding.lastInterest.amount), formatDate(holding.lastInterest.date))] : []),
      ],
      note: "An estimate: each month's balance × rate ÷ 12, added up. It is replaced by the credited figure when you import the passbook that has it.",
    };
  }
  const coming = f.deposits.held.filter((d) => d.maturityDate > today).slice(0, 4);
  if (coming.length > 0) {
    cards.next = { title: "Next to mature", total: formatShortDate(coming[0].maturityDate), rows: coming.map((d) => row(d.id, d.name, DOOR_COLOR.fd, formatDate(d.maturityDate), expectedLine(d))) };
  }
  return cards;
}

// ---------- What needs attention ----------
export type AttentionKind = "interest" | "incomplete" | "due" | "late";
export interface AttentionItem {
  /** Unique on the page: a late credit has one for each late month. */
  id: string;
  kind: AttentionKind;
  title: string;
  text: string;
  /** The deposit a button opens, for the items about one. */
  depositId?: string;
}

export function attentionView(f: FixedIncome, today: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  const holding = f.epf.holdings[0];
  for (const h of f.epf.holdings) {
    for (const m of h.lateMonths) {
      items.push({ id: `late-${m.wageMonth}`, kind: "late", title: `${formatMonthShort(m.wageMonth)}'s EPF credit is late.`, text: `Credits have come about the ${Number(m.due?.slice(8, 10) ?? 18)}th. Download a fresh passbook and add it, or add the credit by hand.` });
    }
  }
  if (f.deposits.due.length > 0) {
    const first = f.deposits.due[0];
    items.push({ id: "due", kind: "due", title: f.deposits.due.length === 1 ? `${first.name} has matured.` : `${f.deposits.due.length} deposits have matured.`, text: "Close it when the money reaches your account, to record what you received.", depositId: first.id });
  }
  if (f.epf.estimate > 0 && holding?.ratePercent) {
    items.push({ id: "interest", kind: "interest", title: `EPF's FY ${financialYearOf(today)} interest isn't credited yet.`, text: `About ${rupees(f.epf.estimate)} has built up at last year's ${holding.ratePercent}%. The rate is declared later, so it stays an estimate.` });
  }
  if (f.deposits.incomplete.length > 0) {
    const n = f.deposits.incomplete.length;
    items.push({ id: "incomplete", kind: "incomplete", title: `${n === 1 ? "The deposit has" : `The ${n} deposits have`} no bank and no maturity amount.`, text: "Add what your FD app shows so worth today and maturity use the bank's own figures.", depositId: f.deposits.incomplete[0].id });
  }
  return items;
}

// ---------- The doors and their stages ----------
export interface Door {
  id: DoorId;
  label: string;
  total: string;
  sub: string;
  /** 0-1: the bar along the foot of the door. */
  fraction: number;
}

export interface Tile {
  label: string;
  value: string;
  note: string;
}

export type ChartView =
  | { kind: "built"; points: BuiltUpPoint[]; note: string }
  | { kind: "epf"; bars: EpfBar[]; note: string }
  | { kind: "deposits"; bars: DepositBar[]; today: string; note: string };

export interface StageView {
  id: DoorId;
  colorKey: ColorKey;
  eyebrow: string;
  title: string;
  big: { amount: string; unit: string };
  caption: string;
  chips: string[];
  tiles: Tile[];
  chart: ChartView | null;
}

export function doorsView(f: FixedIncome): Door[] {
  const holding = f.epf.holdings[0];
  const share = (part: number) => (f.total > 0 ? part / f.total : 0);
  return [
    { id: "all", label: "Everything", total: formatLakh(f.total), sub: `EPF and ${plural(f.deposits.held.length, "deposit", "deposits")}`, fraction: f.total > 0 ? 1 : 0 },
    { id: "epf", label: "EPF", total: formatLakh(f.epf.total), sub: `${f.total > 0 ? Math.round(share(f.epf.total) * 100) : 0}% of it${holding?.ratePercent ? ` · ${holding.ratePercent}% a year` : ""}`, fraction: share(f.epf.total) },
    { id: "fd", label: "Fixed deposits", total: formatLakh(f.deposits.worth), sub: `${plural(f.deposits.held.length, "deposit", "deposits")}${f.deposits.held.length ? ` · ${f.deposits.held[0].interestRate}%` : ""}`, fraction: share(f.deposits.worth) },
  ];
}

export function stagesView(input: FixedIncomeData, f: FixedIncome, today: string): Record<DoorId, StageView> {
  const holding = f.epf.holdings[0];
  const next = holding?.nextCredit;
  const epfShare = f.total > 0 ? Math.round((f.epf.total / f.total) * 100) : 0;
  const fy = financialYearOf(today);
  const all: StageView = {
    id: "all",
    colorKey: DOOR_COLOR.all,
    eyebrow: "EPF and deposits together",
    title: "Your fixed income",
    big: lakhParts(f.total),
    caption: `${epfShare}% of it is EPF${f.epf.estimate > 0 ? ` · ${approx(f.epf.estimate)} more interest is on its way` : ""}`,
    chips: [`Earning ${rupees(f.perDay)} a day`, ...(next ? [next.late ? `Credit late: expected about ${formatShortDate(next.due)}` : `Next in about ${formatShortDate(next.due)}`] : [])],
    tiles: [
      { label: "Earned so far", value: rupees(f.earned), note: "EPF interest credited and the deposits' interest" },
      { label: "Put in", value: formatLakh(f.putIn), note: "your and your employer's contributions, and the deposits" },
      { label: "Earning a month", value: rupees(f.perMonth), note: "at today's pace" },
      f.deposits.nextMaturity
        ? { label: "First deposit matures", value: formatDate(f.deposits.nextMaturity.deposit.maturityDate), note: monthsPhrase(f.deposits.nextMaturity.months) }
        : { label: "Deposits", value: "none maturing", note: f.deposits.held.length ? "all past their maturity day" : "none held" },
    ],
    chart: { kind: "built", points: builtUpSeries(input, today), note: "EPF steps up each March when the year's interest is credited." + (f.deposits.held.length ? ` The deposits began in ${formatMonthShort(firstStart(f.deposits.held))} ${firstStart(f.deposits.held).slice(0, 4)}.` : "") },
  };
  const epf: StageView = {
    id: "epf",
    colorKey: DOOR_COLOR.epf,
    eyebrow: `Employees' provident fund${holding ? ` · ${holding.name}` : ""}`,
    title: "EPF passbook",
    big: lakhParts(f.epf.total),
    caption: holding ? `as your passbook says${holding.lastInterest ? `: interest to ${formatDate(holding.lastInterest.date)}` : ""}${holding.lastCredit ? `, contributions to ${formatShortDate(holding.lastCredit.date)}` : ""}` : "No passbook imported yet",
    chips: holding ? [...(holding.ratePercent ? [`Rate ${holding.ratePercent}%`] : []), `Employee ${formatLakh(f.epf.employee)}`, `Employer ${formatLakh(f.epf.employer)}`, `Pension ${formatLakh(f.epf.pension)}`] : [],
    tiles: [
      { label: "Put in this year", value: rupees(holding?.putInThisYear.amount ?? 0), note: `${plural(holding?.putInThisYear.count ?? 0, "credit", "credits")}${holding?.lastCredit ? ` · ${formatInr(holding.lastCredit.amount)} a month now` : ""}` },
      { label: "Interest not credited", value: f.epf.estimate > 0 ? approx(f.epf.estimate) : "none yet", note: holding?.ratePercent ? `${holding.estimate.months} months, at ${holding.ratePercent}%` : "no rate known" },
      { label: "Credited last year", value: holding?.lastInterest ? rupees(holding.lastInterest.amount) : "none yet", note: holding?.lastInterest ? `on ${formatDate(holding.lastInterest.date)}` : "until a passbook has it" },
      { label: "Earning a day", value: `₹${f.epf.perDay.toFixed(2)}`, note: "on the passbook balance" },
    ],
    chart: { kind: "epf", bars: epfBars(input.epfEntries, next ?? null, today), note: next ? `The last bar is the next credit, expected about ${formatShortDate(next.due)}.` : `FY ${fy}` },
  };
  const first = f.deposits.held[0];
  const fd: StageView = {
    id: "fd",
    colorKey: DOOR_COLOR.fd,
    eyebrow: "Fixed deposits",
    title: "Your deposits",
    big: lakhParts(f.deposits.worth),
    caption: f.deposits.held.length ? `${plural(f.deposits.held.length, "deposit", "deposits")} · ${first.interestRate}% · an estimate until you add the bank's figures` : "None held",
    chips: [],
    tiles: [
      { label: "Placed", value: rupees(f.deposits.placed), note: plural(f.deposits.held.length, "deposit", "deposits") },
      { label: "Built up", value: rupees(f.deposits.accrued), note: "interest so far, by quarterly compounding" },
      { label: "Earning a day", value: rupees(f.perDay - f.epf.perDay), note: "at each one's own rate" },
      f.deposits.nextMaturity ? { label: "First matures", value: formatDate(f.deposits.nextMaturity.deposit.maturityDate), note: monthsPhrase(f.deposits.nextMaturity.months) } : { label: "First matures", value: "none", note: "nothing running" },
    ],
    chart: f.deposits.held.length ? { kind: "deposits", bars: depositBars(input.deposits, today), today, note: "Each bar runs from the day a deposit started to the day it matures." } : null,
  };
  return { all, epf, fd };
}
const firstStart = (deposits: FixedDeposit[]): string => [...deposits].map((d) => d.startDate).sort()[0];
