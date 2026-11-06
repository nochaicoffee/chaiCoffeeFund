import { daysBetween } from "@/lib/aggregate/cardSpend";
import { annualRatePercent, lentLoanColor, summariseLentLoan } from "@/lib/aggregate/lentOut";
import { upcomingPayouts, type PayoutVerdict } from "@/lib/aggregate/lentPromises";
import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatDate, formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { LentLoan } from "@/lib/sheets/types";
import type { LentModel } from "./views";

/**
 * The widgets under the clock (docs/design/lent-out.md, C4): the loans table, Interest coming up and Money back, as plain, already-formatted
 * data. The numbers come from lib/aggregate (lentOut, lentWho, lentPromises); nothing here works anything out that isn't shown.
 */

const inr = (n: number) => formatInr(Math.round(n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const rate = (loan: LentLoan) => `${Number(annualRatePercent(loan).toFixed(1))}%`;
const every = (loan: LentLoan) => (loan.payoutFrequency === "Monthly" ? "a month" : loan.payoutFrequency === "Quarterly" ? "a quarter" : "a year");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekday = (iso: string) => WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
const dayMonth = (iso: string) => ({ day: String(Number(iso.slice(8, 10))), month: formatMonthShort(iso.slice(0, 7)).toUpperCase() });

// ---------- The loans table ----------

export interface LoanTableRow {
  id: string;
  name: string;
  colorKey: ColorKey;
  kind: "Accruing" | "Paid-out";
  /** "lent Oct 1, 2024 · 766 days". */
  lent: string;
  /** A linked payout loan's promises, as dots. */
  verdicts?: PayoutVerdict[];
  rate: string;
  rateNote: string;
  lentAmount: string;
  lentNote: string;
  back: string;
  backNote: string;
  interest: string;
  interestNote: string;
  /** The interest note is a warning: a payout missing. */
  interestWarn: boolean;
  owed: string;
  owedNote: string;
  next: string;
  nextNote: string;
  /** Marked Repaid: closed. */
  repaid: boolean;
  /** Still marked Active, but everything has come back and nothing is owed: it can be marked repaid, not reopened. */
  settled: boolean;
}

export interface LoansTableView {
  rows: LoanTableRow[];
  total: { lent: string; back: string; interest: string; interestNote: string; owed: string };
}

export function loansTableView(m: LentModel): LoansTableView | null {
  if (m.data.loans.length === 0) return null;
  const { who, today } = m;
  const live = who.blocks.map((b) => ({ loan: b.loan, owed: b.owedToday, summary: b.summary, perDay: b.perDay }));
  const out = who.repaid.map((loan) => ({ loan, owed: 0, summary: summariseLentLoan(loan, m.data.repayments, today), perDay: 0 }));
  const rows: LoanTableRow[] = [...live, ...out].map(({ loan, owed, summary, perDay }) => {
    const accruing = loan.interestMode === "Accruing";
    const p = m.promises[loan.id];
    const back = loan.principalAmount - summary.principalOutstanding;
    const repaid = loan.status === "Repaid";
    const settled = !repaid && owed <= 0.005;
    const days = daysBetween(loan.startDate, today);
    const next = p?.next;
    let interest = "—";
    let interestNote = repaid ? "closed" : settled ? "nothing owed" : "no income source, not tracked";
    let interestWarn = false;
    if (accruing && !repaid) {
      // What has piled up in all; what is still owed and what was paid are in the note.
      interest = inr(summary.interestAccrued);
      interestNote = summary.interestPaid > 0 ? `${inr(summary.interestOwed)} owed, ${inr(summary.interestPaid)} paid` : `owed · piling up ${inr(perDay)} a day`;
    } else if (p?.linked) {
      interest = inr(p.promised);
      interestNote = `so far: ${inr(p.arrived)} in${p.notHere > 0 ? `, ${inr(p.notHere)} not here` : ""}`;
      interestWarn = p.notHere > 0;
    }
    return {
      id: loan.id,
      name: loan.borrowerName,
      colorKey: cardColorKey(lentLoanColor(loan)),
      kind: loan.interestMode,
      lent: `lent ${formatDate(loan.startDate)} · ${plural(days, "day", "days")}`,
      ...(p?.linked && { verdicts: p.promises.map((x) => x.verdict) }),
      rate: rate(loan),
      rateNote: accruing ? "simple, a year" : "from the payout",
      lentAmount: inr(loan.principalAmount),
      lentNote: accruing ? "one lump sum" : `${inr(loan.payoutAmount ?? 0)} ${every(loan)}`,
      back: inr(back > 0 ? back : 0),
      backNote: back > 0 ? (repaid ? "all of it" : "principal") : "none returned",
      interest,
      interestNote,
      interestWarn,
      owed: inr(owed),
      owedNote: repaid ? "repaid" : settled ? "paid back in full" : accruing ? "principal + interest" : "principal only",
      next: repaid || settled ? "—" : accruing ? "No date" : next ? formatDate(next.date) : "—",
      nextNote: repaid ? (loan.closedDate ? `repaid ${formatShortDate(loan.closedDate)}` : "repaid") : settled ? "nothing owed" : accruing ? "paid when they pay" : next ? `in ${plural(next.inDays, "day", "days")} · ${inr(next.amount)}` : "not tracked",
      repaid,
      settled,
    };
  });
  const principal = live.reduce((t, r) => t + r.loan.principalAmount, 0);
  const backAll = live.reduce((t, r) => t + (r.loan.principalAmount - (r.summary?.principalOutstanding ?? 0)), 0);
  const { earned, received, notYet } = m.clock.allTime;
  return {
    rows,
    total: {
      lent: inr(principal),
      back: inr(backAll),
      interest: inr(earned),
      interestNote: `${inr(received)} received · ${inr(notYet)} not yet`,
      owed: inr(who.total),
    },
  };
}

// ---------- Interest coming up ----------

export interface ComingUpRow {
  key: string;
  /** The payout's day, ISO. Only a dated payout has one. */
  date?: string;
  /** A dated payout has a day and month; the 12% pile has none and says it is daily. */
  day?: string;
  month?: string;
  daily?: boolean;
  colorKey: ColorKey;
  title: string;
  /** "overdue" rows lead and are drawn amber. */
  overdue: boolean;
  note: string;
  amount: string;
  when: string;
}

export interface ComingUpView {
  rows: ComingUpRow[];
  note: string;
}

export function comingUpView(m: LentModel): ComingUpView | null {
  const rows: ComingUpRow[] = [];
  const until = addMonthsUTC(m.today, 12);
  const dated: (ComingUpRow & { date: string })[] = [];
  for (const b of m.who.blocks) {
    const loan = b.loan;
    const colorKey = cardColorKey(lentLoanColor(loan));
    const p = m.promises[loan.id];
    if (loan.interestMode === "Accruing" && b.perDay > 0) {
      rows.push({ key: `pile-${loan.id}`, daily: true, colorKey, title: loan.borrowerName, overdue: false, note: `${rate(loan)} simple · piles up, paid when they pay`, amount: `+${inr(b.perDay)}`, when: `a day, ${inr(b.perDay * 30)} in 30` });
    }
    if (!p?.linked) continue;
    // A payout that is overdue (not yet missing) leads, with what to do about it.
    for (const x of p.promises.filter((q) => q.verdict === "Overdue")) {
      dated.push({ key: `late-${loan.id}-${x.date}`, date: x.date, ...dayMonth(x.date), colorKey, title: `${loan.borrowerName}`, overdue: true, note: `${inr(loan.payoutAmount ?? 0)} ${every(loan)} · due ${weekday(x.date)} · not matched to a bank credit yet`, amount: inr(x.amount), when: `${plural(x.daysAfter ?? 0, "day", "days")} over` });
    }
    for (const x of upcomingPayouts(loan, m.data.sources.find((s) => s.id === loan.incomeSourceId), m.data.entries, m.today, until)) {
      dated.push({ key: `next-${loan.id}-${x.date}`, date: x.date, ...dayMonth(x.date), colorKey, title: loan.borrowerName, overdue: false, note: `${inr(loan.payoutAmount ?? 0)} ${every(loan)} · ${weekday(x.date)}`, amount: inr(x.amount), when: x.inDays === 0 ? "today" : `in ${plural(x.inDays, "day", "days")}` });
    }
  }
  dated.sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
  const overdue = dated.filter((d) => d.overdue);
  const rest = dated.filter((d) => !d.overdue);
  const all: ComingUpRow[] = [...overdue, ...rows, ...rest];
  if (all.length === 0) return null;
  return { rows: all, note: "Each payout is matched to the bank credit through the loan's income source, so it shows as received here and in Income." };
}

// ---------- Money back ----------

export interface MoneyBackRow {
  key: string;
  date: string;
  day: string;
  month: string;
  colorKey: ColorKey;
  title: string;
  /** "on time", "late", "principal", "interest". */
  tag: "on time" | "late" | "principal" | "interest";
  /** A repayment he recorded can be deleted: its id. A payout that arrived through Income has none. */
  repaymentId?: string;
  note: string;
  amount: string;
  when: string;
}

export interface MoneyBackView {
  rows: MoneyBackRow[];
  /** Shown when no repayment has been recorded. */
  empty?: string;
}

export function moneyBackView(m: LentModel): MoneyBackView | null {
  const rows: MoneyBackRow[] = [];
  const byId = new Map(m.data.loans.map((l) => [l.id, l]));
  for (const loan of m.data.loans) {
    const colorKey = cardColorKey(lentLoanColor(loan));
    for (const x of m.promises[loan.id]?.promises ?? []) {
      if ((x.verdict !== "On time" && x.verdict !== "Paid late") || !x.receivedDate) continue;
      rows.push({ key: `payout-${loan.id}-${x.date}`, date: x.receivedDate, ...dayMonth(x.receivedDate), colorKey, title: loan.borrowerName, tag: x.verdict === "On time" ? "on time" : "late", note: "Interest · from Income, matched to the bank credit", amount: inr(x.amount), when: `due ${formatShortDate(x.date)}` });
    }
  }
  for (const r of m.data.repayments) {
    const loan = byId.get(r.lentLoanId);
    if (!loan) continue;
    rows.push({ key: `rep-${r.id}`, date: r.date, ...dayMonth(r.date), colorKey: cardColorKey(lentLoanColor(loan)), title: loan.borrowerName, tag: r.kind === "Principal" ? "principal" : "interest", repaymentId: r.id, note: `${r.kind === "Principal" ? "Principal" : "Interest"} · recorded by you`, amount: inr(r.amount), when: "came back" });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
  const noPrincipal = !m.data.repayments.some((r) => r.kind === "Principal");
  if (rows.length === 0 && !noPrincipal) return null;
  const accruing = m.data.loans.find((l) => l.interestMode === "Accruing");
  return {
    rows,
    ...(noPrincipal && { empty: `No principal has come back yet, so there are no repayments to log.${accruing ? ` The interest on ${accruing.borrowerName}'s loan will land here as a repayment when they pay.` : ""}` }),
  };
}

