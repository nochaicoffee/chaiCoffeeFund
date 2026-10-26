import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { bookFacts, loanColor, loanFacts, timeUntil, usualEffect, type BookFacts, type LoanFacts } from "@/lib/aggregate/loans";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatDate, formatDayDate, formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { Loan, LoanCategory, LoanInstallment, LoanPrepayment } from "@/lib/sheets/types";

/**
 * What the Loans page shows (docs/design/loans.md, LoansN1), as plain, already-formatted data: the greeting's
 * sentence and the cards its figures point at, the attention strip, and the cover (a tile per loan, the EMI cliffs and
 * the payoff capsules). The widgets below the cover are in widgetsView.ts. The numbers come from lib/aggregate/loans.ts.
 */

export const ALL = "all";

/** A Loans page's address, keeping `?demo` bare and leaving out the default pick (all loans). */
export function loansHref(path: "/loans" | "/loans/installments", { demo, loan }: { demo: boolean; loan?: string }): string {
  const q = new URLSearchParams();
  if (demo) q.set("demo", "");
  if (loan && loan !== ALL) q.set("loan", loan);
  const text = q.toString().replace(/(^|&)demo=(&|$)/, "$1demo$2");
  return `${path}${text ? `?${text}` : ""}`;
}

export interface LoansData {
  loans: Loan[];
  installments: LoanInstallment[];
  prepayments: LoanPrepayment[];
  /** Names only, for where an EMI is paid from. */
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string; color: ColorKey }[];
  /** A month's salary, from Income's active salary sources; null with none. For the EMI load only. */
  salary: number | null;
}

const factsOf = new WeakMap<LoansData, LoanFacts[]>();

/** Every loan's facts, active loans first (then by when they end), closed loans after. Worked out once per page's data. */
export function allFacts(data: LoansData): LoanFacts[] {
  const known = factsOf.get(data);
  if (known) return known;
  const facts = data.loans
    .map((loan) => loanFacts(loan, data.installments, data.prepayments))
    .sort((a, b) => (a.loan.status !== b.loan.status ? (a.loan.status === "Active" ? -1 : 1) : a.end < b.end ? 1 : a.end > b.end ? -1 : 0));
  factsOf.set(data, facts);
  return facts;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const percent = (share: number) => `${Math.round(share * 100)}%`;
export const colorOf = (loan: Loan): ColorKey => cardColorKey(loanColor(loan));
export const inDays = (from: string, to: string) => {
  const n = daysBetween(from, to);
  return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : n === -1 ? "yesterday" : `${-n} days ago`;
};
export const monthYear = (date: string) => `${formatMonthShort(date.slice(0, 7))} ${date.slice(0, 4)}`;
/** "16 years 7 months", or "this month". */
export function yearsMonths(from: string, to: string): string {
  const t = timeUntil(from, to);
  return [t.years ? plural(t.years, "year") : "", t.months ? plural(t.months, "month") : ""].filter(Boolean).join(" ") || "this month";
}
/** "20 yr" or "18 mo". */
export const tenureText = (months: number) => (months % 12 === 0 ? `${months / 12} yr` : `${months} mo`);

/** Where an installment was (or will be) paid from, by name. */
export function paidFromName(data: Pick<LoansData, "accounts" | "cards">, place: { accountId?: string; cardId?: string }): string | undefined {
  if (place.cardId) {
    const card = data.cards.find((c) => c.id === place.cardId);
    return card ? `${card.name} (card)` : "A card";
  }
  if (place.accountId) return data.accounts.find((a) => a.id === place.accountId)?.name ?? "An account";
  return undefined;
}
const emiPlace = (loan: Loan) => ({ accountId: loan.emiPaidFromAccountId, cardId: loan.emiPaidFromCardId });

// ---------- The greeting ----------

export type LoanGreetingPoint = "owed" | "emi" | "repaid" | "interest" | "next" | "free";
export type LoanGreetingCards = Partial<Record<LoanGreetingPoint, { title: string; total: string; rows: GreetingRowData[]; note?: string }>>;

export function summarySentence(data: LoansData, today: string): SentencePart[] {
  const book = bookFacts(allFacts(data));
  if (data.loans.length === 0) return [{ text: "No loans yet. Add one with its sanction letter's numbers, and its whole schedule is worked out for you." }];
  if (book.loans.length === 0) return [{ text: `You're debt-free: ${plural(data.loans.length, "loan")} paid off, nothing owed.` }];
  const parts: SentencePart[] = [
    { text: "You owe " },
    { text: formatInr(book.owed), strong: true, point: "owed" },
    { text: ` across ${plural(book.loans.length, "loan")}, and ` },
    { text: formatInr(book.emi), strong: true, point: "emi" },
    { text: " goes out in EMIs each month. " },
    { text: percent(book.repaidShare), strong: true, point: "repaid" },
    { text: " of what you borrowed is repaid, with " },
    { text: formatInr(book.interestLeft), strong: true, point: "interest" },
    { text: " of interest still to come." },
  ];
  if (book.next) {
    const loan = data.loans.find((l) => l.id === book.next!.loanId)!;
    const overdue = book.next.dueDate < today;
    parts.push({ text: " Your next EMI, " }, { text: formatInr(book.next.totalDue), strong: true, point: "next" }, { text: ` for the ${loan.name}, ${overdue ? "was due" : "is due"} ${formatShortDate(book.next.dueDate)}${overdue ? ` (${inDays(today, book.next.dueDate)})` : ""}, and you'll be ` });
  } else parts.push({ text: " You'll be " });
  parts.push({ text: `debt-free in ${monthYear(book.debtFree!)}`, strong: true, point: "free" }, { text: "." });
  return parts;
}

export function greetingView(data: LoansData, today: string): LoanGreetingCards {
  const book = bookFacts(allFacts(data));
  if (book.loans.length === 0) return {};
  const row = (f: LoanFacts, amount: string, note?: string, fraction?: number): GreetingRowData => ({ key: f.loan.id, name: f.loan.name, colorKey: colorOf(f.loan), amount, note, fraction });
  const cards: LoanGreetingCards = {
    owed: {
      title: "Still owed",
      total: formatInr(book.owed),
      rows: book.loans.map((f) => row(f, formatInr(f.outstanding), `${f.loan.lenderName} · ${plural(f.left, "EMI")} left`, book.owed ? f.outstanding / book.owed : 0)),
      note: `${formatInr(book.borrowed)} borrowed, ${formatInr(book.principalRepaid)} repaid. The principal of every EMI not yet paid.`,
    },
    emi: {
      title: "EMIs each month",
      total: formatInr(book.emi),
      rows: book.loans.map((f) => row(f, formatInr(f.emi), paidFromName(data, emiPlace(f.loan)), book.emi ? f.emi / book.emi : 0)),
      note: data.salary ? `${percent(book.emi / data.salary)} of your ${formatInr(data.salary)} salary.` : `${plural(book.loans.length, "active loan")}.`,
    },
    repaid: {
      title: "Repaid so far",
      total: percent(book.repaidShare),
      rows: book.loans.map((f) => row(f, percent(f.repaidShare), `${formatInr(f.principalRepaid)} of ${formatInr(f.loan.principalAmount)}`, f.repaidShare)),
      note: `${formatInr(book.principalRepaid)} of the ${formatInr(book.borrowed)} you borrowed. Principal only: interest is counted apart.`,
    },
    interest: {
      title: "Interest still to pay",
      total: formatInr(book.interestLeft),
      rows: book.loans.map((f) => row(f, formatInr(f.interestLeft), `${formatInr(f.interestPaid)} paid so far`)),
      note: "From each loan's schedule, if every EMI is paid on time.",
    },
  };
  if (book.next) {
    const f = book.loans.find((x) => x.loan.id === book.next!.loanId)!;
    const next = book.next;
    cards.next = {
      title: `${f.loan.name} · EMI ${next.installmentNumber} of ${f.count}`,
      total: formatInr(next.totalDue),
      rows: [
        { key: "p", name: "Principal", colorKey: "forest", amount: formatInr(next.principalDue) },
        { key: "i", name: "Interest", colorKey: "amber", amount: formatInr(next.interestDue) },
      ],
      note: `Due ${formatDayDate(next.dueDate)}, ${inDays(today, next.dueDate)}${paidFromName(data, emiPlace(f.loan)) ? `, from ${paidFromName(data, emiPlace(f.loan))}` : ""}. Mark it paid once it's gone through.`,
    };
  }
  cards.free = {
    title: "Debt-free",
    total: formatDate(book.debtFree!),
    rows: [...book.loans].sort((a, b) => (a.end < b.end ? -1 : 1)).map((f) => row(f, monthYear(f.end), yearsMonths(today, f.end))),
    note: `${yearsMonths(today, book.debtFree!)} from today: when the last EMI of the last loan is due.`,
  };
  return cards;
}

// ---------- The attention strip ----------

export interface AttentionItem {
  installmentId: string;
  loanId: string;
  name: string;
  amount: string;
  text: string;
  overdue: boolean;
}

/**
 * A line per loan with an EMI due within a week, or past its due date and not marked paid: the oldest one, and how many
 * more are overdue behind it (a loan added after several EMIs have gone shows one line, not one a month).
 */
export function attentionView(data: LoansData, today: string): AttentionItem[] {
  const active = new Map(data.loans.filter((l) => l.status === "Active").map((l) => [l.id, l]));
  const soon = data.installments.filter((i) => i.status === "Pending" && active.has(i.loanId) && daysBetween(today, i.dueDate) <= 7).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const firsts = soon.filter((i, k) => soon.findIndex((x) => x.loanId === i.loanId) === k);
  return firsts.map((i) => {
    const loan = active.get(i.loanId)!;
    const from = paidFromName(data, emiPlace(loan));
    const overdue = i.dueDate < today;
    const more = soon.filter((x) => x.loanId === i.loanId && x.id !== i.id && x.dueDate < today).length;
    return {
      installmentId: i.id,
      loanId: loan.id,
      name: loan.name,
      amount: formatInr(i.totalDue),
      overdue,
      text: overdue
        ? `was due ${formatShortDate(i.dueDate)} (${inDays(today, i.dueDate)}) and isn't marked paid${more ? `, with ${plural(more, "more EMI")} overdue after it` : ""}.`
        : `is due ${formatShortDate(i.dueDate)} (${inDays(today, i.dueDate)})${from ? ` and will be ${loan.emiPaidFromCardId ? "charged to" : "paid from"} ${from}` : ""}.`,
    };
  });
}

// ---------- The cover ----------

export interface CoverTile {
  id: string;
  name: string;
  sub: string;
  colorKey: ColorKey;
  category: LoanCategory | "All";
  owed: number;
  repaidShare: number;
  repaidText: string;
  foot: string;
}

export interface CliffMonth {
  key: string;
  /** What's due in the month, by loan id. */
  byLoan: Record<string, number>;
  total: number;
}

export interface CliffsView {
  months: CliffMonth[];
  /** The month today is in, and today as the marker writes it. */
  now: string;
  today: string;
  loans: { id: string; name: string; colorKey: ColorKey; end: string; emi: number }[];
  /** Where each loan ends, and what leaves each month after it. */
  flags: { loanId: string; name: string; month: string; text: string }[];
  top: number;
}

export interface Capsule {
  id: string;
  name: string;
  category: LoanCategory;
  colorKey: ColorKey;
  owed: string;
  repaidShare: number;
  termShare: number;
}

export interface CoverView {
  tiles: CoverTile[];
  cliffs: CliffsView;
  capsules: Capsule[];
}

export function coverView(data: LoansData, today: string): CoverView {
  const facts = allFacts(data);
  const book = bookFacts(facts);
  const tiles: CoverTile[] = [
    {
      id: ALL,
      name: "All loans",
      sub: `${plural(book.loans.length, "loan")} · ${formatInr(book.emi)} a month`,
      colorKey: "emerald",
      category: "All",
      owed: book.owed,
      repaidShare: book.repaidShare,
      repaidText: `${percent(book.repaidShare)} repaid`,
      foot: book.debtFree ? `Debt-free ${monthYear(book.debtFree)}` : "Nothing owed",
    },
    ...book.loans.map((f) => ({
      id: f.loan.id,
      name: f.loan.name,
      sub: `${f.loan.lenderName} · ${f.loan.annualInterestRate}%`,
      colorKey: colorOf(f.loan),
      category: f.loan.category,
      owed: f.outstanding,
      repaidShare: f.repaidShare,
      repaidText: `${percent(f.repaidShare)} repaid`,
      foot: f.next ? `EMI ${formatInr(f.emi)} · next ${formatShortDate(f.next.dueDate)}` : "All paid",
    })),
  ];

  // The cliffs: what leaves each month, from six months ago to the last EMI.
  const now = today.slice(0, 7);
  const start = monthKeyAdd(now, -6);
  const end = book.debtFree ? book.debtFree.slice(0, 7) : now;
  const active = new Set(book.loans.map((f) => f.loan.id));
  const months: CliffMonth[] = [];
  for (let key = start; key <= end; key = monthKeyAdd(key, 1)) months.push({ key, byLoan: {}, total: 0 });
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const i of data.installments) {
    const at = index.get(i.dueDate.slice(0, 7));
    if (at === undefined || !active.has(i.loanId)) continue;
    const m = months[at];
    m.byLoan[i.loanId] = Math.round(((m.byLoan[i.loanId] ?? 0) + i.totalDue) * 100) / 100;
    m.total = Math.round((m.total + i.totalDue) * 100) / 100;
  }
  const ending = [...book.loans].sort((a, b) => (a.end < b.end ? -1 : 1));
  const flags = ending.map((f, k) => {
    const after = ending.slice(k + 1).reduce((t, x) => t + x.emi, 0);
    return { loanId: f.loan.id, name: f.loan.name, month: f.end.slice(0, 7), text: `${monthYear(f.end)} · −${formatInr(f.emi)} a month${after ? `, ${formatInr(after)} after` : ""}` };
  });

  return {
    tiles,
    cliffs: {
      months,
      now,
      today: formatShortDate(today),
      loans: book.loans.map((f) => ({ id: f.loan.id, name: f.loan.name, colorKey: colorOf(f.loan), end: f.end, emi: f.emi })),
      flags,
      top: Math.max(1, ...months.map((m) => m.total)),
    },
    capsules: book.loans.map((f) => ({
      id: f.loan.id,
      name: f.loan.name,
      category: f.loan.category,
      colorKey: colorOf(f.loan),
      owed: `${formatInrCompact(f.outstanding)} of ${formatInrCompact(f.loan.principalAmount)} owed`,
      repaidShare: f.repaidShare,
      termShare: f.termShare,
    })),
  };
}

/** A month key `n` months on: ("2026-10", 3) → "2027-01". */
export function monthKeyAdd(key: string, n: number): string {
  const total = Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1 + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** The picks: All loans, then each active loan. */
export function pickIds(data: LoansData): string[] {
  return [ALL, ...bookFacts(allFacts(data)).loans.map((f) => f.loan.id)];
}

export type { BookFacts, LoanFacts };
export { usualEffect };

// ---------- The forms ----------

export interface FormLoan {
  loan: Loan;
  colorKey: ColorKey;
  installments: LoanInstallment[];
  prepayments: LoanPrepayment[];
}

export interface LoanFormsData {
  demo: boolean;
  today: string;
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string; color: ColorKey }[];
  /** Every loan, active first; Mark paid and Add prepayment offer the active ones. */
  loans: FormLoan[];
}

export function loanFormsData(data: LoansData, today: string, demo: boolean): LoanFormsData {
  return {
    demo,
    today,
    accounts: data.accounts,
    cards: data.cards,
    loans: allFacts(data).map((f) => ({ loan: f.loan, colorKey: colorOf(f.loan), installments: f.installments, prepayments: f.prepayments })),
  };
}
