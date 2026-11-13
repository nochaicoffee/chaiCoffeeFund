import { balanceOn, dayBefore, totalOn } from "./accounts";
import { dueDateFor, nextStatementDate } from "./cardSchedule";
import { emiExceedsBalance, netDisbursedAmount, paidIntoAccount } from "./loans";
import { monthRange, type MonthKey } from "./cardSpend";
import { nextOccurrence } from "./recurring";
import { addDays } from "./subscriptionRenewals";
import { nextRenewalsFrom } from "./subscriptionNextCharges";
import type { RupeeSnapshot } from "./accountCurrency";
import type { Account, BalanceReview, BalanceSnapshot, BigSpend, Card, Goal, IncomeEntry, IncomeSource, InvestmentTransaction, LentLoan, LentRepayment, Loan, LoanInstallment, Statement, Subscription, SubscriptionPayment, Transfer } from "../sheets/types";

/**
 * Where an account's money went and came from, worked out from records kept elsewhere
 * in the app, never from the account itself (docs/design/accounts.md, decisions 2 and 19).
 * Every figure is "worked out", not a statement:
 * - Card bills: a statement paid from the account (`Statement.paidFromAccountId`), on its paid date.
 * - Subscriptions: a paid payment charged to the account, or to nothing when the subscription's
 *   usual place is the account. A payment charged to a card is inside that card's bill instead.
 * - EMIs: an installment paid from the account, on its paid date (a card-paid one is in the card's bill).
 * - Investments: money sent from a bank account to a Brokerage account (a Transfer), on the bank's side. Trades don't count here:
 *   they happen inside the broker, with its cash, so none of them leaves a bank.
 * - Came in: a received income entry landing in the account, on its received date.
 * - Taken back: money a Brokerage account sent back to a bank account (a Transfer), profit and all. It isn't earnings, so it's not
 *   "came in": it's investing in reverse. Invested = sent − taken back, so a year that took more back than it sent is negative.
 * - Borrowed: a loan's disbursal into the account (what reached it, after the bank's fees), on its disbursement day. It isn't income,
 *   so it's not "came in" and not saved; it is money the bank account held, so kept in the bank counts it. A loan paid straight to a
 *   seller never reached an account and isn't counted.
 * - Lent out: money lent to a person (a LentLoan naming the account it left), on the day it was lent. Paid back: what came back on it
 *   (LentRepayments), counted into the same account, principal and interest alike, like money taken back from a broker. A loan with no
 *   account named isn't counted. Like investing, lending isn't spending: it stays in saved, and kept in the bank = saved + borrowed −
 *   invested − lent (lent out less paid back). A paid-out loan's interest arrives as income and is in came in already.
 * - A transfer between two of his rupee bank accounts is Moved out of one and Moved in to the other: across all accounts the two cancel,
 *   and on one account's view it explains that account's balance. It isn't income or spending, and isn't in Left the bank. A transfer
 *   between two brokers, or between accounts in different currencies that aren't a bank and a broker, isn't counted.
 * - Big spends: a large purchase entered by hand (BigSpends) that left a bank account, on its date: a car bought from savings. One
 *   charged to a card is inside that card's bill, so only the bank-paid ones count here. On Expenses a big spend only explains a month
 *   worked out from balances; here nothing else records that money leaving, so it is an expense like a bill. A goal marked bought
 *   (Done, with its day, cost and the account it was paid from) counts the same way, under the goal's name, so a purchase
 *   recorded on Goals isn't typed again as a big spend.
 * - Expenses = card bills + subscriptions + EMIs + big spends. Saved = came in − expenses, so money invested
 *   counts as saved (decision 19); kept in the bank = saved + borrowed − invested.
 * - Everything else: the balance change those don't explain (UPI, cash, transfers between your own
 *   accounts, which aren't recorded anywhere).
 */

/** A dollar account that isn't counted, as the page tells it: its name and what it holds in dollars. */
export interface UnpricedAccount {
  id: string;
  name: string;
  dollars: number | null;
  /** The account and its snapshots (in dollars), so the forms can still update it while the rate is down. */
  account: Account;
  snapshots: BalanceSnapshot[];
}

export interface AccountsData {
  accounts: Account[];
  /** In rupees: a dollar account's carry the dollars as `native` (lib/aggregate/accountCurrency.ts). */
  snapshots: RupeeSnapshot[];
  cards: Card[];
  statements: Statement[];
  subscriptions: Subscription[];
  subscriptionPayments: SubscriptionPayment[];
  loans: Loan[];
  installments: LoanInstallment[];
  trades: InvestmentTransaction[];
  /** Money moved between his own accounts. Optional: data from before the Transfers tab has none. */
  transfers?: Transfer[];
  /** Money lent to people, and what came back. Optional: the demo and older callers have none. */
  lentLoans?: LentLoan[];
  lentRepayments?: LentRepayment[];
  /** Large purchases entered by hand. Optional: the demo and older callers have none. */
  bigSpends?: BigSpend[];
  /** Goals, whose bought ones paid from an account count as big spends. Optional, like big spends. */
  goals?: Goal[];
  incomeSources: IncomeSource[];
  incomeEntries: IncomeEntry[];
  /** Balances a bank statement disagreed with (BalanceReviews). Left out where there are none to show. */
  reviews?: BalanceReview[];
  /** Dollar accounts left out of every total because today's rate couldn't be had (ADR 0012), with why. Absent when none. */
  unpriced?: { accounts: UnpricedAccount[]; reason: string };
  /** Today's USD to INR, when a dollar account is counted (ADR 0012): what a dollar balance is shown against. */
  usdInr?: number;
}

export const OUT_KINDS = ["Card bills", "Subscriptions", "EMIs", "Big spends", "Investments"] as const;
export type OutKind = (typeof OUT_KINDS)[number];

export interface MoneyItem {
  kind: OutKind | "Came in" | "Taken back" | "Borrowed" | "Lent out" | "Paid back" | "Moved out" | "Moved in";
  date: string;
  amount: number;
  accountId: string;
  label: string;
}

const within = (date: string | undefined, from: string, to: string): date is string => !!date && date >= from && date <= to;

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
  // A transfer between a bank and a broker, counted on the bank's side (the broker's cash is what bought the shares, not the bank's).
  // Dollar accounts left out of the totals because today's rate couldn't be had are still accounts: a transfer to one still left the bank.
  const accountsById = new Map([...data.accounts, ...(data.unpriced?.accounts.map((u) => u.account) ?? [])].map((a) => [a.id, a]));
  const sameCurrency = (t: Transfer) => (accountsById.get(t.fromAccountId)?.currency ?? "INR") === (accountsById.get(t.toAccountId)?.currency ?? "INR");
  const isBroker = (id: string) => accountsById.get(id)?.accountType === "Brokerage";
  const nameOf = (id: string) => accountsById.get(id)?.name ?? "Broker";
  for (const t of data.transfers ?? []) {
    if (!within(t.date, from, to) || !accountsById.has(t.fromAccountId) || !accountsById.has(t.toAccountId)) continue;
    if (!isBroker(t.fromAccountId) && isBroker(t.toAccountId)) items.push({ kind: "Investments", date: t.date, amount: t.amount, accountId: t.fromAccountId, label: nameOf(t.toAccountId) });
    else if (isBroker(t.fromAccountId) && !isBroker(t.toAccountId)) {
      // Dollars back to a rupee bank count as the rupees that arrived; without them it can't be counted (the routes refuse such a row).
      const amount = t.receivedAmount ?? (sameCurrency(t) ? t.amount : undefined);
      if (amount !== undefined) items.push({ kind: "Taken back", date: t.date, amount, accountId: t.toAccountId, label: nameOf(t.fromAccountId) });
    } else if (!isBroker(t.fromAccountId) && !isBroker(t.toAccountId) && sameCurrency(t) && (accountsById.get(t.fromAccountId)?.currency ?? "INR") === "INR") {
      // Between two of his own banks: out of one, into the other.
      items.push({ kind: "Moved out", date: t.date, amount: t.amount, accountId: t.fromAccountId, label: nameOf(t.toAccountId) });
      items.push({ kind: "Moved in", date: t.date, amount: t.amount, accountId: t.toAccountId, label: nameOf(t.fromAccountId) });
    }
  }
  for (const b of data.bigSpends ?? []) {
    if (b.paidFromAccountId && accountsById.has(b.paidFromAccountId) && within(b.date, from, to) && b.amount > 0) items.push({ kind: "Big spends", date: b.date, amount: b.amount, accountId: b.paidFromAccountId, label: b.name });
  }
  for (const g of data.goals ?? []) {
    if (g.status !== "Done" || !g.paidFromAccountId || !accountsById.has(g.paidFromAccountId) || !within(g.doneOn, from, to) || !((g.actualCost ?? 0) > 0)) continue;
    items.push({ kind: "Big spends", date: g.doneOn, amount: g.actualCost!, accountId: g.paidFromAccountId, label: g.name });
  }
  for (const l of data.loans) {
    // Only into an account he has, like a transfer: a loan naming one that isn't listed reached nothing counted here.
    if (!paidIntoAccount(l) || !accountsById.has(l.accountId) || !within(l.disbursementDate, from, to)) continue;
    const amount = netDisbursedAmount(l);
    if (amount > 0) items.push({ kind: "Borrowed", date: l.disbursementDate, amount, accountId: l.accountId, label: l.name });
  }
  const lent = new Map<string, LentLoan>();
  for (const l of data.lentLoans ?? []) {
    if (!l.paidFromAccountId || !accountsById.has(l.paidFromAccountId)) continue;
    lent.set(l.id, l);
    if (within(l.startDate, from, to)) items.push({ kind: "Lent out", date: l.startDate, amount: l.principalAmount, accountId: l.paidFromAccountId, label: l.borrowerName });
  }
  const principalBack = new Map<string, number>();
  for (const r of data.lentRepayments ?? []) {
    const l = lent.get(r.lentLoanId);
    if (!l?.paidFromAccountId) continue;
    if (r.kind === "Principal") principalBack.set(l.id, (principalBack.get(l.id) ?? 0) + r.amount);
    if (within(r.date, from, to) && r.amount > 0) items.push({ kind: "Paid back", date: r.date, amount: r.amount, accountId: l.paidFromAccountId, label: l.borrowerName });
  }
  // Mark repaid writes no repayment: the principal still out on the closing day came back that day.
  for (const l of lent.values()) {
    const rest = l.principalAmount - (principalBack.get(l.id) ?? 0);
    if (l.status === "Repaid" && l.paidFromAccountId && within(l.closedDate, from, to) && rest > 0) items.push({ kind: "Paid back", date: l.closedDate, amount: rest, accountId: l.paidFromAccountId, label: l.borrowerName });
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
  /** Card bills + subscriptions + EMIs + big spends. */
  expenses: number;
  /** Sent to brokers less taken back from them: negative when more came back than went. */
  invested: number;
  /** Money sent from the bank to brokers. */
  sent: number;
  /** Money brokers sent back to the bank. */
  takenBack: number;
  /** Loans paid into the account (net of the bank's fees). Not income, so not in came in or saved. */
  borrowed: number;
  /** Money lent to people less what they paid back: negative when more came back than went. */
  lent: number;
  lentOut: number;
  paidBack: number;
  /** Moved in from his other bank accounts less moved out to them: always 0 across all accounts. */
  moved: number;
  /** Came in − expenses: investing counts as saved (decision 19). */
  saved: number;
  /** Saved + borrowed − invested − lent + moved. */
  keptInBank: number;
  /** Everything that left the account: expenses, what was sent to brokers and what was lent. */
  leftBank: number;
}

/** What `flows` needs of a movement, so the hero can carry them to the browser without their labels. */
export type FlowItem = Pick<MoneyItem, "kind" | "date" | "amount" | "accountId">;

const sum = (items: FlowItem[], kind: MoneyItem["kind"]) => items.filter((i) => i.kind === kind).reduce((total, i) => total + i.amount, 0);

/** What came in and went out, for one account or (null) all of them, between two days. */
export function flows(items: FlowItem[], accountId: string | null): Flows {
  const mine = accountId === null ? items : items.filter((i) => i.accountId === accountId);
  const out = { "Card bills": sum(mine, "Card bills"), Subscriptions: sum(mine, "Subscriptions"), EMIs: sum(mine, "EMIs"), "Big spends": sum(mine, "Big spends"), Investments: sum(mine, "Investments") };
  const cameIn = sum(mine, "Came in");
  const expenses = out["Card bills"] + out.Subscriptions + out.EMIs + out["Big spends"];
  const saved = cameIn - expenses;
  const takenBack = sum(mine, "Taken back");
  const invested = out.Investments - takenBack;
  const borrowed = sum(mine, "Borrowed");
  const lentOut = sum(mine, "Lent out");
  const paidBack = sum(mine, "Paid back");
  const lent = lentOut - paidBack;
  const moved = sum(mine, "Moved in") - sum(mine, "Moved out");
  return { cameIn, out, expenses, invested, sent: out.Investments, takenBack, borrowed, lent, lentOut, paidBack, moved, saved, keptInBank: saved + borrowed - invested - lent + moved, leftBank: expenses + out.Investments + lentOut };
}

/** The movements after `after` up to and including `to`: the stretch between two readings of a line. Without `after`, everything up to `to`. */
export function itemsBetween<T extends FlowItem>(items: T[], after: string | null, to: string): T[] {
  return items.filter((i) => (after === null || i.date > after) && i.date <= to);
}

/**
 * What came in and went out over a stretch of the hero's line, between the readings on two of its days. A stretch that
 * starts at the line's first day takes everything from the start of the period, and one that ends at its last day takes
 * everything to the end, so measuring the whole line gives the whole period's figures.
 */
export function flowsOverStretch(items: FlowItem[], accountId: string | null, line: { first: string; last: string }, from: string, to: string): Flows {
  return flows(itemsBetween(items, from <= line.first ? null : from, to >= line.last ? "9999-12-31" : to), accountId);
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
  // The day each account's change is measured from (its balance at the end of that day): only what moved after it explains the change.
  const measuredAfter = new Map<string, string>();
  for (const account of scope) {
    const end = balanceOn(data.snapshots, account.id, to);
    if (!end) continue;
    const before = balanceOn(data.snapshots, account.id, dayBefore(from));
    if (before) {
      change += end.balance - before.balance;
      measuredAfter.set(account.id, dayBefore(from));
      continue;
    }
    const first = data.snapshots.filter((s) => s.accountId === account.id).reduce<BalanceSnapshot | null>((best, s) => (best === null || s.date < best.date ? s : best), null);
    if (first) {
      change += end.balance - first.balance;
      measuredAfter.set(account.id, first.date);
    }
  }
  // An account first read inside the span already holds what moved before that reading, and one with no balance has nothing to explain.
  const mine = items.filter((i) => (accountId === null || i.accountId === accountId) && i.date > (measuredAfter.get(i.accountId) ?? "9999-12-31"));
  const explained = sum(mine, "Came in") + sum(mine, "Taken back") + sum(mine, "Borrowed") + sum(mine, "Paid back") - sum(mine, "Lent out") + sum(mine, "Moved in") - sum(mine, "Moved out") - OUT_KINDS.reduce((total, kind) => total + sum(mine, kind), 0);
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
  /** An EMI bigger than what the account holds today (an account with no balance recorded isn't flagged). */
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
  const held = (id: string) => balanceOn(data.snapshots, id, today)?.balance ?? null;
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
      const from = i.paidFromAccountId ?? loan.accountId;
      if (i.loanId !== loan.id || i.status !== "Pending" || i.paidFromCardId || !from) continue;
      add({ kind: "EMI", date: i.dueDate, amount: i.totalDue, accountId: from, label: loan.name, about: false, short: emiExceedsBalance(i.totalDue, held(from)) });
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
 * The bridge from where the span starts to where it ends: what came in, came back from brokers, went out in
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
  add("Taken back", f.takenBack);
  add("Borrowed", f.borrowed);
  add("Paid back", f.paidBack);
  // Between his own banks: nothing across all of them, the net on one account's.
  add("Your other accounts", f.moved);
  for (const kind of OUT_KINDS) add(kind, -f.out[kind]);
  add("Lent out", -f.lentOut);
  add("Everything else", rest.unexplained, true);
  // Whatever is left to reach the end: the balances accounts arrived with when first read inside the span, net of what moved through
  // them before that reading (which the steps above count, and their first balance already holds).
  add("Accounts opened", end - steps.reduce((total, s) => total + s.amount, 0));
  steps.push({ label: "Now", amount: end, kind: "total" });
  return steps;
}
