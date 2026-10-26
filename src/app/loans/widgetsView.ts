import { daysBetween } from "@/lib/aggregate/cardSpend";
import { bookFacts, isLate, loadZone, splitByMonth, timeUntil, usualEffect, type LoadZone, type LoanFacts } from "@/lib/aggregate/loans";
import type { ColorKey } from "@/lib/format/colors";
import { formatDate, formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { Loan, LoanCategory, LoanInstallment, LoanPrepayment, PrepaymentEffect } from "@/lib/sheets/types";
import { ALL, allFacts, colorOf, inDays, monthKeyAdd, monthYear, paidFromName, percent, plural, tenureText, yearsMonths, type LoansData } from "./views";

/**
 * The widgets under the Loans cover (docs/design/loans.md, LoansN1), in the page's order: Principal and interest
 * beside Payments, the Loans table, the Schedule beside Coming up, Cost anatomy beside the Debt-free clock, What if
 * beside Inside an EMI, then EMI load beside Cost of borrowing. Each one that follows the pick is keyed by pick id
 * (`all`, or a loan's id). Plain, already-formatted data, except what a client widget works out itself (the what-if).
 */

export interface LoanBadge {
  id: string;
  name: string;
  category: LoanCategory;
  colorKey: ColorKey;
  closed: boolean;
}
const badge = (loan: Loan): LoanBadge => ({ id: loan.id, name: loan.name, category: loan.category, colorKey: colorOf(loan), closed: loan.status === "Closed" });

// ---------- Principal and interest, month by month or by year ----------

export interface SplitBar {
  key: string;
  label: string;
  /** A year under January's label, or the first bar's. */
  sub?: string;
  principal: number;
  interest: number;
  now: boolean;
  future: boolean;
  /** Each loan's EMIs in it, for the hover card (all loans only). */
  byLoan: { name: string; colorKey: ColorKey; amount: number }[];
}

export interface SplitView {
  months: SplitBar[];
  years: SplitBar[];
  /** This month's and this year's split, for the line under the chart. */
  thisMonth: { principal: number; interest: number };
  thisYear: { principal: number; interest: number };
}

function splitView(data: LoansData, today: string, loanIds: Set<string>): SplitView {
  const rows = data.installments.filter((i) => loanIds.has(i.loanId));
  const byMonth = splitByMonth(rows);
  const names = new Map(data.loans.map((l) => [l.id, l]));
  const now = today.slice(0, 7);
  const loansIn = (prefix: string) => {
    const totals = new Map<string, number>();
    for (const i of rows) if (i.dueDate.startsWith(prefix)) totals.set(i.loanId, (totals.get(i.loanId) ?? 0) + i.totalDue);
    return [...totals].map(([id, amount]) => ({ name: names.get(id)!.name, colorKey: colorOf(names.get(id)!), amount: Math.round(amount) }));
  };
  const months: SplitBar[] = [];
  for (let k = -11; k <= 12; k++) {
    const key = monthKeyAdd(now, k);
    const m = byMonth.get(key) ?? { principal: 0, interest: 0 };
    months.push({ key, label: formatMonthShort(key), sub: k === -11 || key.endsWith("-01") ? `’${key.slice(2, 4)}` : undefined, principal: m.principal, interest: m.interest, now: key === now, future: key > now, byLoan: loanIds.size > 1 ? loansIn(key) : [] });
  }
  const thisYear = Number(today.slice(0, 4));
  const lastYear = Math.max(thisYear, ...rows.map((i) => Number(i.dueDate.slice(0, 4))));
  const years: SplitBar[] = [];
  for (let y = thisYear; y <= Math.min(lastYear, thisYear + 29); y++) {
    let principal = 0;
    let interest = 0;
    for (const [key, m] of byMonth) {
      if (!key.startsWith(String(y))) continue;
      principal += m.principal;
      interest += m.interest;
    }
    years.push({ key: String(y), label: `’${String(y).slice(2)}`, principal: Math.round(principal), interest: Math.round(interest), now: y === thisYear, future: y > thisYear, byLoan: loanIds.size > 1 ? loansIn(String(y)) : [] });
  }
  return { months, years, thisMonth: byMonth.get(now) ?? { principal: 0, interest: 0 }, thisYear: { principal: years[0]?.principal ?? 0, interest: years[0]?.interest ?? 0 } };
}

// ---------- Payments: the pick's paid EMIs, and its prepayments ----------

export interface PaymentRow {
  id: string;
  loan: LoanBadge;
  title: string;
  paidOn: string;
  amount: string;
  from?: string;
  late?: string;
}

export interface PrepaymentRow {
  id: string;
  loan: LoanBadge;
  date: string;
  amount: string;
  effect: string;
  charge: string;
  source: string;
}

export interface PaymentsView {
  rows: PaymentRow[];
  /** "The 6 most recent of 33 this year". */
  count: string;
  prepayments: PrepaymentRow[];
}

const EFFECT_TEXT: Record<PrepaymentEffect, string> = { "Reduce-Tenure": "Fewer EMIs", "Reduce-Emi": "Lower EMI", Close: "Closed the loan" };

function paymentsView(data: LoansData, facts: LoanFacts[], today: string, shown = 6): PaymentsView {
  const paid = facts.flatMap((f) => f.installments.filter((i) => i.status === "Paid").map((i) => ({ i, f }))).sort((a, b) => ((a.i.paidDate ?? a.i.dueDate) < (b.i.paidDate ?? b.i.dueDate) ? 1 : -1));
  const year = today.slice(0, 4);
  const thisYear = paid.filter(({ i }) => (i.paidDate ?? i.dueDate).startsWith(year)).length;
  const rows = paid.slice(0, shown).map(({ i, f }) => ({
    id: i.id,
    loan: badge(f.loan),
    title: `EMI ${i.installmentNumber} of ${f.count}`,
    paidOn: formatShortDate(i.paidDate ?? i.dueDate),
    amount: formatInr(i.amountPaid ?? i.totalDue),
    from: paidFromName(data, { accountId: i.paidFromAccountId, cardId: i.paidFromCardId }),
    ...(isLate(i) && { late: `${plural(daysBetween(i.dueDate, i.paidDate!), "day")} late${i.overdueCharge ? `, ${formatInr(i.overdueCharge)} charge` : ""}` }),
  }));
  const prepayments = facts
    .flatMap((f) => f.prepayments.map((p) => ({ p, f })))
    .sort((a, b) => (a.p.date < b.p.date ? 1 : -1))
    .map(({ p, f }) => ({ id: p.id, loan: badge(f.loan), date: formatShortDate(p.date), amount: formatInr(p.amount), effect: EFFECT_TEXT[p.effect], charge: p.charge ? formatInr(p.charge) : "No charge", source: p.source === "Excess-Emi" ? "Paid over an EMI" : "Added" }));
  return { rows, count: rows.length === 0 ? "No EMIs paid yet" : `The ${rows.length} most recent of ${thisYear} this year`, prepayments };
}

// ---------- The Loans table ----------

export interface LoanRow {
  loan: LoanBadge;
  sub: string;
  borrowed: string;
  emi: string;
  repaidShare: number;
  repaidText: string;
  owed: string;
  owedNote: string;
  next?: { date: string; when: string; soon: boolean };
  closedText?: string;
  ends: string;
  endsNote: string;
  /** The hover card on the repaid bar. */
  hover: { title: string; detail: string; rows: { name: string; amount: string; kind: "principal" | "interest" | "plain" }[]; note: string };
}

export interface LoansTableView {
  rows: LoanRow[];
  foot: { active: number; owed: string; emi: string };
}

function loansTable(facts: LoanFacts[], today: string): LoansTableView {
  const book = bookFacts(facts);
  return {
    rows: facts.map((f) => {
      const closed = f.loan.status === "Closed";
      const soon = !!f.next && daysBetween(today, f.next.dueDate) <= 7;
      return {
        loan: badge(f.loan),
        sub: `${f.loan.lenderName} · ${f.loan.annualInterestRate}% · ${tenureText(f.loan.tenureMonths)}`,
        borrowed: formatInr(f.loan.principalAmount),
        emi: formatInr(f.emi),
        repaidShare: closed ? 1 : f.repaidShare,
        repaidText: closed ? `All ${f.paidCount} paid` : `${f.paidCount} of ${f.count} paid · ${percent(f.repaidShare)}`,
        owed: formatInr(closed ? 0 : f.outstanding),
        owedNote: closed ? "Closed" : `${plural(f.left, "EMI")} left`,
        ...(!closed && f.next && { next: { date: formatShortDate(f.next.dueDate), when: inDays(today, f.next.dueDate), soon } }),
        ...(closed && { closedText: `Closed ${monthYear(f.installments.findLast((i) => i.status === "Paid")?.paidDate ?? f.end)}` }),
        ends: monthYear(f.end),
        endsNote: closed ? "done" : yearsMonths(today, f.end),
        hover: {
          title: `${(f.repaidShare * 100).toFixed(1)}% repaid`,
          detail: `${formatInr(f.principalRepaid)} of ${formatInr(f.loan.principalAmount)}`,
          rows: [
            { name: "Paid so far, with charges", amount: formatInr(f.totalPaid), kind: "principal" },
            { name: "Of which interest", amount: formatInr(f.interestPaid), kind: "interest" },
            { name: "Interest still to come", amount: formatInr(f.interestLeft), kind: "interest" },
            ...(f.prepaid ? [{ name: "Prepaid", amount: formatInr(f.prepaid), kind: "plain" as const }] : []),
          ],
          note: f.lateCount ? `${plural(f.lateCount, "EMI")} paid late` : "Every EMI on time",
        },
      };
    }),
    foot: { active: book.loans.length, owed: formatInr(book.owed), emi: formatInr(book.emi) },
  };
}

// ---------- The schedule of the picked loan ----------

export interface ScheduleRow {
  id: string;
  number: number;
  due: string;
  opening: string;
  principal: string;
  interest: string;
  emi: string;
  paid: boolean;
  next: boolean;
  status: { tone: "paid" | "late" | "due" | "overdue" | "later"; text: string };
}

export interface ScheduleView {
  loan: LoanBadge;
  note: string;
  rows: ScheduleRow[];
  foot: string;
  count: number;
}

export function scheduleRow(i: LoanInstallment, next: LoanInstallment | null, today: string): ScheduleRow {
  const days = daysBetween(today, i.dueDate);
  const status: ScheduleRow["status"] =
    i.status === "Paid"
      ? isLate(i) ? { tone: "late", text: `Paid · ${plural(daysBetween(i.dueDate, i.paidDate!), "day")} late` } : { tone: "paid", text: "Paid" }
      : days < 0 ? { tone: "overdue", text: `Overdue · ${plural(-days, "day")}` } : days <= 7 ? { tone: "due", text: days === 0 ? "Due today" : `Due ${inDays(today, i.dueDate)}` } : { tone: "later", text: formatShortDate(i.dueDate) };
  return { id: i.id, number: i.installmentNumber, due: formatDate(i.dueDate), opening: formatInr(i.openingBalance), principal: formatInr(i.principalDue), interest: formatInr(i.interestDue), emi: formatInr(i.totalDue), paid: i.status === "Paid", next: next?.id === i.id, status };
}

function scheduleView(f: LoanFacts, today: string, before = 3, after = 5): ScheduleView {
  const at = f.next ? f.installments.indexOf(f.next) : f.installments.length;
  const start = Math.max(0, Math.min(at - before, f.installments.length - before - after));
  const rows = f.installments.slice(start, start + before + after).map((i) => scheduleRow(i, f.next, today));
  return {
    loan: badge(f.loan),
    note: f.next ? `EMI ${f.next.installmentNumber} of ${f.count} next · ${f.loan.annualInterestRate}% reducing balance` : `All ${f.count} paid`,
    rows,
    foot: f.next ? `Interest falls and principal grows every month; the EMI stays ${formatInr(f.emi)}` : "Every EMI is paid",
    count: f.count,
  };
}

// ---------- Coming up ----------

export interface ComingRow {
  id: string;
  loanId: string;
  day: string;
  month: string;
  title: string;
  when: string;
  soon: boolean;
  detail: string;
  amount: string;
}

export interface ComingUpView {
  rows: ComingRow[];
  foot: string;
}

function comingUp(data: LoansData, facts: LoanFacts[], today: string, shown = 5): ComingUpView {
  const book = bookFacts(facts);
  const next = book.loans.flatMap((f) => f.installments.filter((i) => i.status === "Pending").slice(0, 2).map((i) => ({ i, f }))).sort((a, b) => (a.i.dueDate < b.i.dueDate ? -1 : 1));
  const soon30 = book.loans.flatMap((f) => f.installments.filter((i) => i.status === "Pending" && daysBetween(today, i.dueDate) < 30));
  return {
    rows: next.slice(0, shown).map(({ i, f }) => {
      const from = paidFromName(data, { accountId: f.loan.emiPaidFromAccountId, cardId: f.loan.emiPaidFromCardId });
      return {
        id: i.id,
        loanId: f.loan.id,
        day: String(Number(i.dueDate.slice(8, 10))),
        month: formatMonthShort(i.dueDate.slice(0, 7)).toUpperCase(),
        title: `${f.loan.name} · EMI ${i.installmentNumber} of ${f.count}`,
        when: inDays(today, i.dueDate),
        soon: daysBetween(today, i.dueDate) <= 7,
        detail: `${formatInr(i.principalDue)} principal, ${formatInr(i.interestDue)} interest${from ? ` · ${from}` : ""}`,
        amount: `−${formatInr(i.totalDue)}`,
      };
    }),
    foot: soon30.length ? `Next 30 days: ${formatInr(soon30.reduce((t, i) => t + i.totalDue, 0))} from ${plural(soon30.length, "EMI")}` : "Nothing due in the next 30 days",
  };
}

// ---------- Cost anatomy: each loan in multiples of what was borrowed ----------

export interface AnatomyRow {
  loan: LoanBadge;
  borrowed: string;
  /** Each part as a multiple of the loan amount. */
  repaid: number;
  owed: number;
  interestPaid: number;
  interestLeft: number;
  multiple: string;
  interestLeftText: string;
}

function anatomy(facts: LoanFacts[]): { rows: AnatomyRow[]; scale: number } {
  const rows = facts.map((f) => {
    const p = f.loan.principalAmount || 1;
    return {
      loan: badge(f.loan),
      borrowed: `${formatInrCompact(f.loan.principalAmount)} borrowed`,
      repaid: f.principalRepaid / p,
      owed: f.outstanding / p,
      interestPaid: f.interestPaid / p,
      interestLeft: f.interestLeft / p,
      multiple: `${((f.loan.principalAmount + f.interestTotal) / p).toFixed(2)}×`,
      interestLeftText: formatInrCompact(f.interestLeft),
    };
  });
  const most = Math.max(1, ...rows.map((r) => r.repaid + r.owed + r.interestPaid + r.interestLeft));
  return { rows, scale: Math.max(1.5, Math.ceil(most * 2 + 0.3) / 2) };
}

// ---------- The debt-free clock ----------

export interface ClockView {
  years: number;
  months: number;
  days: number;
  caption: string;
  bars: { loan: LoanBadge; share: number; end: string }[];
}

function clock(facts: LoanFacts[], pick: string, today: string): ClockView | null {
  const book = bookFacts(facts);
  if (!book.debtFree) return null;
  const mine = pick === ALL ? book.loans : book.loans.filter((f) => f.loan.id === pick);
  const target = mine.map((f) => f.end).sort().at(-1)!;
  const t = timeUntil(today, target);
  const span = Math.max(1, daysBetween(today, book.debtFree));
  return {
    years: t.years,
    months: t.months,
    days: t.days,
    caption: `until ${pick === ALL ? "the last EMI" : `the ${mine[0].loan.name} ends`} · ${formatDate(target)}`,
    bars: [...book.loans].sort((a, b) => (a.end < b.end ? -1 : 1)).map((f) => ({ loan: badge(f.loan), share: Math.max(0.02, daysBetween(today, f.end) / span), end: monthYear(f.end) })),
  };
}

// ---------- What if: a prepayment today (worked out in the browser, on these rows) ----------

export interface WhatIfLoan {
  loan: Loan;
  badge: LoanBadge;
  installments: LoanInstallment[];
  effect: PrepaymentEffect;
  /** Where the amount starts: about a tenth of what's left, in ₹10,000s. */
  amount: number;
  outstanding: number;
}

function whatIfLoan(f: LoanFacts): WhatIfLoan {
  return { loan: f.loan, badge: badge(f.loan), installments: f.installments, effect: usualEffect(f.loan), amount: Math.max(10000, Math.round(f.outstanding / 10 / 10000) * 10000), outstanding: f.outstanding };
}

// ---------- Inside an EMI ----------

export interface EmiPoint {
  number: number;
  of: number;
  due: string;
  total: string;
  principal: string;
  interest: string;
  /** Interest over the EMI. */
  interestShare: number;
}

export interface EmiAnatomyView {
  loan: LoanBadge;
  points: { first: EmiPoint; next: EmiPoint | null; last: EmiPoint };
  /** The principal share of each EMI over the loan, sampled for the curve. */
  curve: { at: number; principalShare: number }[];
}

function emiAnatomy(f: LoanFacts): EmiAnatomyView | null {
  const rows = f.installments;
  if (rows.length === 0) return null;
  const point = (i: LoanInstallment): EmiPoint => ({ number: i.installmentNumber, of: f.count, due: formatDate(i.dueDate), total: formatInr(i.totalDue), principal: formatInr(i.principalDue), interest: formatInr(i.interestDue), interestShare: i.totalDue ? i.interestDue / i.totalDue : 0 });
  const step = Math.max(1, Math.ceil(rows.length / 120));
  const curve = rows.filter((_, k) => k % step === 0 || k === rows.length - 1).map((i) => ({ at: rows.length > 1 ? (i.installmentNumber - rows[0].installmentNumber) / (rows.length - 1) : 0, principalShare: i.totalDue ? i.principalDue / i.totalDue : 1 }));
  return { loan: badge(f.loan), points: { first: point(rows[0]), next: f.next ? point(f.next) : null, last: point(rows.at(-1)!) }, curve };
}

// ---------- EMI load: the share of salary that goes to EMIs ----------

export interface LoadView {
  salary: string;
  share: number;
  zone: LoadZone;
  emi: string;
  segments: { loan: LoanBadge; share: number; amount: string }[];
  leftOver: string;
  leftShare: number;
}

function load(facts: LoanFacts[], pick: string, salary: number | null): LoadView | null {
  if (!salary) return null;
  const book = bookFacts(facts);
  const mine = pick === ALL ? book.loans : book.loans.filter((f) => f.loan.id === pick);
  const emi = mine.reduce((t, f) => t + f.emi, 0);
  return {
    salary: formatInr(salary),
    share: emi / salary,
    zone: loadZone(emi / salary),
    emi: formatInr(emi),
    segments: book.loans.map((f) => ({ loan: badge(f.loan), share: f.emi / salary, amount: formatInr(f.emi) })),
    leftOver: formatInr(salary - book.emi),
    leftShare: Math.max(0, (salary - book.emi) / salary),
  };
}

// ---------- Cost of borrowing ----------

export interface CostView {
  borrowed: string;
  netDisbursed: string;
  interest: string;
  interestNote: string;
  charges: string;
  total: string;
  paidShare: number;
  paidText: string;
  toGo: string;
  rows: { loan: LoanBadge; interest: string; charges: string; multiple: string }[];
  note: string;
}

function cost(facts: LoanFacts[]): CostView | null {
  const book = bookFacts(facts);
  if (book.loans.length === 0) return null;
  const interest = book.interestTotal + book.preEmiInterest;
  const total = book.borrowed + interest + book.charges;
  const paid = book.principalRepaid + book.interestPaid + book.preEmiInterest + book.charges;
  return {
    borrowed: formatInr(book.borrowed),
    netDisbursed: `${formatInr(book.netDisbursed)} reached your accounts`,
    interest: formatInr(interest),
    interestNote: `${formatInr(book.interestPaid)} paid, ${formatInr(book.interestLeft)} to come${book.preEmiInterest ? `, ${formatInr(book.preEmiInterest)} pre-EMI` : ""}`,
    charges: formatInr(book.charges),
    total: formatInr(interest + book.charges),
    paidShare: total ? paid / total : 0,
    paidText: `${formatInr(paid)} paid so far (${percent(total ? paid / total : 0)})`,
    toGo: `${formatInr(total - paid)} to go`,
    rows: book.loans.map((f) => ({
      loan: badge(f.loan),
      interest: formatInrCompact(f.interestTotal + f.loan.preEmiInterest),
      charges: formatInrCompact(f.charges),
      multiple: `${(1 + (f.interestTotal + f.loan.preEmiInterest + f.charges) / (f.loan.principalAmount || 1)).toFixed(2)}×`,
    })),
    note: `Every ₹100 borrowed costs ₹${Math.round((total / book.borrowed) * 100)} by the end.${book.lateCount ? ` Late charges so far: ${formatInr(book.lateCharges)} across ${plural(book.lateCount, "late EMI")}.` : " No EMI has been late."}`,
  };
}

// ---------- All of them ----------

export interface LoanWidgets {
  split: Record<string, SplitView>;
  payments: Record<string, PaymentsView>;
  table: LoansTableView;
  schedule: Record<string, ScheduleView>;
  comingUp: ComingUpView;
  anatomy: { rows: AnatomyRow[]; scale: number };
  clock: Record<string, ClockView | null>;
  whatIf: Record<string, WhatIfLoan>;
  emiAnatomy: Record<string, EmiAnatomyView | null>;
  load: Record<string, LoadView | null>;
  cost: CostView | null;
}

export function loanWidgets(data: LoansData, today: string): LoanWidgets {
  const facts = allFacts(data);
  const book = bookFacts(facts);
  const picks = [ALL, ...book.loans.map((f) => f.loan.id)];
  const of = (pick: string) => (pick === ALL ? facts : facts.filter((f) => f.loan.id === pick));
  const one = (pick: string, choose: (fs: LoanFacts[]) => LoanFacts | undefined) => (pick === ALL ? choose(book.loans) : book.loans.find((f) => f.loan.id === pick));
  // With all loans: the schedule of the next one due, the what-if on the dearest, and the EMI of the biggest.
  const nextDue = (fs: LoanFacts[]) => fs.find((f) => f.loan.id === book.next?.loanId) ?? fs[0];
  const dearest = (fs: LoanFacts[]) => [...fs].sort((a, b) => b.loan.annualInterestRate - a.loan.annualInterestRate)[0];
  const biggest = (fs: LoanFacts[]) => [...fs].sort((a, b) => b.outstanding - a.outstanding)[0];
  const each = <T>(make: (pick: string) => T | undefined) => Object.fromEntries(picks.flatMap((p) => { const v = make(p); return v === undefined ? [] : [[p, v]]; })) as Record<string, T>;
  return {
    split: each((p) => splitView(data, today, new Set(of(p).map((f) => f.loan.id)))),
    payments: each((p) => paymentsView(data, of(p), today)),
    table: loansTable(facts, today),
    schedule: each((p) => { const f = one(p, nextDue); return f && scheduleView(f, today); }),
    comingUp: comingUp(data, facts, today),
    anatomy: anatomy(facts),
    clock: each((p) => clock(facts, p, today)),
    whatIf: each((p) => { const f = one(p, dearest); return f && whatIfLoan(f); }),
    emiAnatomy: each((p) => { const f = one(p, biggest); return f ? emiAnatomy(f) : undefined; }),
    load: each((p) => load(facts, p, data.salary)),
    cost: cost(facts),
  };
}

export { EFFECT_TEXT };
export type { LoanPrepayment };

// ---------- The installments page ----------

export interface InstallmentsSection {
  loan: LoanBadge;
  sub: string;
  summary: string;
  rows: ScheduleRow[];
  prepayments: PrepaymentRow[];
  /** Open on the page: the picked loan, or the one due next. */
  open: boolean;
}

/** Every installment of every loan (or of `loanId`), a section each, with its prepayments. */
export function installmentsView(data: LoansData, today: string, loanId?: string): InstallmentsSection[] {
  const facts = allFacts(data).filter((f) => !loanId || f.loan.id === loanId);
  const next = bookFacts(facts).next?.loanId;
  return facts.map((f) => ({
    loan: badge(f.loan),
    sub: `${f.loan.lenderName} · ${f.loan.annualInterestRate}% · ${f.count} EMIs from ${formatDate(f.installments[0]?.dueDate ?? f.loan.firstEmiDate)}`,
    summary: f.loan.status === "Closed" ? `Closed · all ${f.paidCount} paid` : `${f.paidCount} of ${f.count} paid · ${formatInr(f.outstanding)} still owed · ${formatInr(f.interestLeft)} interest to come${f.prepaid ? ` · ${formatInr(f.prepaid)} prepaid` : ""}`,
    rows: f.installments.map((i) => scheduleRow(i, f.next, today)),
    prepayments: paymentsView(data, [f], today).prepayments,
    open: Boolean(loanId) || f.loan.id === next,
  }));
}
