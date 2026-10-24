import { balanceOn, dayBefore, totalOn } from "./accounts";
import { dueDateFor, nextStatementDate } from "./cardSchedule";
import { monthRange, type MonthKey } from "./cardSpend";
import { nextOccurrence } from "./recurring";
import { addDays } from "./subscriptionRenewals";
import { nextRenewalsFrom } from "./subscriptionNextCharges";
import type { Account, BalanceReview, BalanceSnapshot, Card, IncomeEntry, IncomeSource, InvestmentTransaction, Loan, LoanInstallment, Statement, Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * Where an account's money went and came from, worked out from records kept elsewhere
 * in the app, never from the account itself (docs/design/accounts.md, decisions 2 and 19).
 * Every figure is "worked out", not a statement:
 * - Card bills: a statement paid from the account (`Statement.paidFromAccountId`), on its paid date.
 * - Subscriptions: a paid payment charged to the account, or to nothing when the subscription's
 *   usual place is the account. A payment charged to a card is inside that card's bill instead.
 * - EMIs: an installment paid from the account, on its paid date (a card-paid one is in the card's bill).
 * - Investments: a Buy settled from the account, in rupees at the trade's frozen rate.
 * - Came in: a received income entry landing in the account, on its received date.
 * - Sold: a Sell's proceeds. They move the balance but aren't earnings, so they're not "came in".
 * - Expenses = card bills + subscriptions + EMIs. Saved = came in − expenses, so money invested
 *   counts as saved (decision 19); kept in the bank = saved − invested.
 * - Everything else: the balance change those don't explain (UPI, cash, transfers between your own
 *   accounts, which aren't recorded anywhere).
 */

export interface AccountsData {
  accounts: Account[];
  snapshots: BalanceSnapshot[];
  cards: Card[];
  statements: Statement[];
  subscriptions: Subscription[];
  subscriptionPayments: SubscriptionPayment[];
  loans: Loan[];
  installments: LoanInstallment[];
  trades: InvestmentTransaction[];
  incomeSources: IncomeSource[];
  incomeEntries: IncomeEntry[];
  /** Balances a bank statement disagreed with (BalanceReviews). Left out where there are none to show. */
  reviews?: BalanceReview[];
}

export const OUT_KINDS = ["Card bills", "Subscriptions", "EMIs", "Investments"] as const;
export type OutKind = (typeof OUT_KINDS)[number];

export interface MoneyItem {
  kind: OutKind | "Came in" | "Sold";
  date: string;
  amount: number;
  accountId: string;
  label: string;
}

const within = (date: string | undefined, from: string, to: string): date is string => !!date && date >= from && date <= to;

/** A trade's total in rupees: a US one at its own frozen rate, never a live one (as in investments.ts). */
function tradeInr(trade: InvestmentTransaction): number {
  return trade.market === "IND" ? trade.total : trade.total * (trade.fxRateToInr ?? 0);
}

/** Every recorded movement of money through an account between two days, inclusive. */
export function moneyItems(data: AccountsData, from: string, to: string): MoneyItem[] {
  const items: MoneyItem[] = [];
  const cardName = new Map(data.cards.map((c) => [c.id, c.alias || c.name]));
  for (const s of data.statements) {
    if (!s.paidFromAccountId || !within(s.paidDate, from, to) || !((s.amountPaid ?? 0) > 0)) continue;
    items.push({ kind: "Card bills", date: s.paidDate, amount: s.amountPaid ?? 0, accountId: s.paidFromAccountId, label: cardName.get(s.cardId) ?? "Card" });
  }
  const subscriptions = new Map(data.subscriptions.map((s) => [s.id, s]));
  for (const p of data.subscriptionPayments) {
    if (p.status !== "Paid" || !within(p.paymentDate, from, to) || !(p.amount > 0)) continue;
    const subscription = subscriptions.get(p.subscriptionId);
    const accountId = p.paidFromAccountId ?? (p.paidFromCardId ? undefined : subscription?.defaultPaidFromAccountId);
    if (accountId) items.push({ kind: "Subscriptions", date: p.paymentDate, amount: p.amount, accountId, label: subscription?.alias || subscription?.name || "Subscription" });
  }
  const loans = new Map(data.loans.map((l) => [l.id, l]));
  for (const i of data.installments) {
    if (i.status !== "Paid" || !i.paidFromAccountId || !within(i.paidDate, from, to)) continue;
    const amount = i.amountPaid ?? i.totalDue;
    if (amount > 0) items.push({ kind: "EMIs", date: i.paidDate, amount, accountId: i.paidFromAccountId, label: loans.get(i.loanId)?.name ?? "Loan" });
  }
  for (const t of data.trades) {
    if (!t.settlementAccountId || !within(t.tradeDate, from, to)) continue;
    const amount = tradeInr(t);
    if (amount > 0) items.push({ kind: t.tradeType === "Buy" ? "Investments" : "Sold", date: t.tradeDate, amount, accountId: t.settlementAccountId, label: t.symbol });
  }
  const sources = new Map(data.incomeSources.map((s) => [s.id, s]));
  for (const e of data.incomeEntries) {
    if (e.status !== "Received" || !e.accountId || !within(e.receivedDate, from, to) || !(e.amount > 0)) continue;
    items.push({ kind: "Came in", date: e.receivedDate, amount: e.amount, accountId: e.accountId, label: sources.get(e.incomeSourceId)?.alias || sources.get(e.incomeSourceId)?.name || "Income" });
  }
  return items;
}

export interface Flows {
  cameIn: number;
  out: Record<OutKind, number>;
  /** Card bills + subscriptions + EMIs. */
  expenses: number;
  invested: number;
  sold: number;
  /** Came in − expenses: investing counts as saved (decision 19). */
  saved: number;
  /** Saved − invested. */
  keptInBank: number;
}

const sum = (items: MoneyItem[], kind: MoneyItem["kind"]) => items.filter((i) => i.kind === kind).reduce((total, i) => total + i.amount, 0);

/** What came in and went out, for one account or (null) all of them, between two days. */
export function flows(items: MoneyItem[], accountId: string | null): Flows {
  const mine = accountId === null ? items : items.filter((i) => i.accountId === accountId);
  const out = { "Card bills": sum(mine, "Card bills"), Subscriptions: sum(mine, "Subscriptions"), EMIs: sum(mine, "EMIs"), Investments: sum(mine, "Investments") };
  const cameIn = sum(mine, "Came in");
  const expenses = out["Card bills"] + out.Subscriptions + out.EMIs;
  const saved = cameIn - expenses;
  return { cameIn, out, expenses, invested: out.Investments, sold: sum(mine, "Sold"), saved, keptInBank: saved - out.Investments };
}

/** Each month's flows, oldest first, for the paired columns. */
export function monthlyFlows(items: MoneyItem[], accountId: string | null, months: MonthKey[]): { month: MonthKey; flows: Flows }[] {
  return months.map((month) => ({ month, flows: flows(items.filter((i) => i.date.startsWith(month)), accountId) }));
}

/** Months from the first to the last of a span, as month keys. */
export function monthsIn(from: string, to: string): MonthKey[] {
  return monthRange(from.slice(0, 7), to.slice(0, 7));
}

/** What came in, split by income source, biggest first. */
export function cameInBySource(data: AccountsData, from: string, to: string, accountId: string | null): { source: string; amount: number }[] {
  const names = new Map(data.incomeSources.map((s) => [s.id, s.alias || s.name]));
  const totals = new Map<string, number>();
  for (const e of data.incomeEntries) {
    if (e.status !== "Received" || !e.accountId || !within(e.receivedDate, from, to) || !(e.amount > 0)) continue;
    if (accountId !== null && e.accountId !== accountId) continue;
    const name = names.get(e.incomeSourceId) ?? "Other";
    totals.set(name, (totals.get(name) ?? 0) + e.amount);
  }
  return [...totals.entries()].map(([source, amount]) => ({ source, amount })).sort((a, b) => b.amount - a.amount);
}

export interface EverythingElse {
  /** The change in balance over the span, leaving out an account's opening balance. */
  change: number;
  /** The change the records explain: came in and sold, less everything recorded going out. */
  explained: number;
  /** change − explained: negative is money out the records don't show (UPI, cash, transfers), positive money in. */
  unexplained: number;
}

/**
 * The balance change the records don't explain (decision 2), for one account or all.
 * Each account counts from the balance carried the day before `from`, or from its first
 * balance when it was opened inside the span: opening an account isn't money coming in.
 */
export function everythingElse(data: AccountsData, items: MoneyItem[], accountId: string | null, from: string, to: string): EverythingElse {
  const scope = data.accounts.filter((a) => accountId === null || a.id === accountId);
  let change = 0;
  for (const account of scope) {
    const end = balanceOn(data.snapshots, account.id, to);
    if (!end) continue;
    const before = balanceOn(data.snapshots, account.id, dayBefore(from));
    if (before) {
      change += end.balance - before.balance;
      continue;
    }
    const first = data.snapshots.filter((s) => s.accountId === account.id).reduce<BalanceSnapshot | null>((best, s) => (best === null || s.date < best.date ? s : best), null);
    if (first) change += end.balance - first.balance;
  }
  const mine = accountId === null ? items : items.filter((i) => i.accountId === accountId);
  const explained = sum(mine, "Came in") + sum(mine, "Sold") - OUT_KINDS.reduce((total, kind) => total + sum(mine, kind), 0);
  return { change, explained, unexplained: change - explained };
}

// --- Coming up (decision 14: usual amounts, a card bill as "about" its last bill) ---

export interface ComingItem {
  kind: "Salary" | "EMI" | "Card bill" | "Subscription";
  date: string;
  amount: number;
  accountId: string;
  label: string;
  /** A card bill worked out from the card's last bill, not yet billed. */
  about: boolean;
  /** An EMI bigger than what the account holds today. */
  short: boolean;
}

/** What's due on or after today, up to `days` ahead, for the accounts it lands in or leaves, soonest first. */
export function comingUp(data: AccountsData, accountId: string | null, today: string, days = 45): ComingItem[] {
  const end = addDays(today, days);
  const items: ComingItem[] = [];
  const add = (item: Omit<ComingItem, "short"> & { short?: boolean }) => {
    if (item.date < today || item.date > end) return;
    if (accountId !== null && item.accountId !== accountId) return;
    items.push({ short: false, ...item });
  };
  const held = (id: string) => balanceOn(data.snapshots, id, today)?.balance ?? 0;
  const activeAccounts = new Set(data.accounts.filter((a) => a.status === "Active").map((a) => a.id));

  // Salary: what's recorded as pending, then each monthly source's next usual day, in the account its last entry landed in.
  for (const e of data.incomeEntries) {
    if (e.status === "Pending" && e.accountId) add({ kind: "Salary", date: e.expectedDate, amount: e.amount, accountId: e.accountId, label: sourceName(data, e.incomeSourceId), about: false });
  }
  for (const source of data.incomeSources) {
    if (source.status !== "Active" || source.frequency !== "Monthly") continue;
    const entries = data.incomeEntries.filter((e) => e.incomeSourceId === source.id && e.accountId).sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1));
    const last = entries.at(-1);
    if (!last?.accountId) continue;
    const date = nextOccurrence(last.expectedDate, "Monthly", today);
    const recorded = data.incomeEntries.some((e) => e.incomeSourceId === source.id && e.expectedDate.slice(0, 7) === date.slice(0, 7));
    if (!recorded) add({ kind: "Salary", date, amount: source.expectedAmount, accountId: last.accountId, label: source.alias || source.name, about: false });
  }

  // EMIs: each active loan's pending installments, from the account it pays from.
  for (const loan of data.loans) {
    if (loan.status !== "Active") continue;
    for (const i of data.installments) {
      if (i.loanId !== loan.id || i.status !== "Pending" || i.paidFromCardId) continue;
      add({ kind: "EMI", date: i.dueDate, amount: i.totalDue, accountId: i.paidFromAccountId ?? loan.accountId, label: loan.name, about: false, short: i.totalDue > held(i.paidFromAccountId ?? loan.accountId) });
    }
  }

  // Card bills: a pending statement as billed, else the next due worked out from the card's last bill.
  for (const card of data.cards) {
    if (card.status !== "Active" || !card.defaultPaidFromAccountId || !activeAccounts.has(card.defaultPaidFromAccountId)) continue;
    const mine = data.statements.filter((s) => s.cardId === card.id);
    const pending = mine.filter((s) => s.status === "Pending" && s.totalAmountDue > 0);
    for (const s of pending) add({ kind: "Card bill", date: s.dueDate, amount: Math.max(0, s.totalAmountDue - (s.amountPaid ?? 0)), accountId: s.paidFromAccountId ?? card.defaultPaidFromAccountId, label: card.alias || card.name, about: false });
    const last = [...mine].sort((a, b) => (a.statementDate < b.statementDate ? 1 : -1))[0];
    if (!last || !(last.totalAmountDue > 0)) continue;
    const nextDue = dueDateFor(card, nextStatementDate(card, today));
    if (!pending.some((s) => s.dueDate === nextDue)) add({ kind: "Card bill", date: nextDue, amount: last.totalAmountDue, accountId: card.defaultPaidFromAccountId, label: card.alias || card.name, about: true });
  }

  // Subscriptions charged straight to an account: each one's next renewal in the window.
  for (const subscription of data.subscriptions) {
    if (subscription.status !== "Active" || !subscription.defaultPaidFromAccountId) continue;
    for (const charge of nextRenewalsFrom([subscription], data.subscriptionPayments, today, 4)) {
      add({ kind: "Subscription", date: charge.date, amount: charge.amount, accountId: subscription.defaultPaidFromAccountId, label: subscription.alias || subscription.name, about: false });
    }
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.label < b.label ? -1 : 1));
}

function sourceName(data: AccountsData, id: string): string {
  const source = data.incomeSources.find((s) => s.id === id);
  return source?.alias || source?.name || "Income";
}

export interface BridgeStep {
  label: string;
  amount: number;
  /** "total" steps (the start and the end) stand on the floor; the rest move it. */
  kind: "total" | "up" | "down";
  /** The remainder the records don't explain (decision 2). */
  worked?: boolean;
}

/**
 * The bridge from where the span starts to where it ends: what came in, was sold, went out in
 * each kind, and everything else; then "Accounts opened", the balances accounts arrived with
 * when first read inside the span, which isn't money moving (confirmed by Prathik 2026-10-22).
 * It always ends on what's held at the span's end.
 */
export function bridgeSteps(data: AccountsData, items: MoneyItem[], accountId: string | null, span: { from: string; to: string }): BridgeStep[] {
  const scope = data.accounts.filter((a) => accountId === null || a.id === accountId);
  const f = flows(items, accountId);
  const rest = everythingElse(data, items, accountId, span.from, span.to);
  const start = totalOn(scope, data.snapshots, dayBefore(span.from));
  const end = totalOn(scope, data.snapshots, span.to);
  const steps: BridgeStep[] = [{ label: "Start", amount: start, kind: "total" }];
  const add = (label: string, amount: number, worked = false) => {
    if (amount !== 0) steps.push({ label, amount, kind: amount > 0 ? "up" : "down", worked });
  };
  add("Came in", f.cameIn);
  add("Sold", f.sold);
  for (const kind of OUT_KINDS) add(kind, -f.out[kind]);
  add("Everything else", rest.unexplained, true);
  add("Accounts opened", end - (start + rest.change));
  steps.push({ label: "Now", amount: end, kind: "total" });
  return steps;
}
