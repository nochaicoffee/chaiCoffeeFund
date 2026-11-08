import { formatMonthYear } from "../format/date";
import { balanceOn, lastDayOfMonth } from "./accounts";
import { addMonths, monthOf, type MonthKey } from "./cardSpend";
import { priceOnOrBefore } from "../prices/history";
import type { PricePoint } from "../prices/history";
import type {
  Account,
  BalanceSnapshot,
  BigSpend,
  Card,
  FixedDeposit,
  IncomeEntry,
  IncomeSource,
  InvestmentTransaction,
  LentLoan,
  LentRepayment,
  Loan,
  LoanInstallment,
  LoanPrepayment,
  Policy,
  PolicyPayment,
  Statement,
  Subscription,
  SubscriptionPayment,
} from "../sheets/types";

/**
 * What he spent each month (docs/design/expenses.md, "The calculation: the pool" and "Build decisions"). Pure.
 *
 * Every account the app has, savings and broker cash alike, is one pool, so money moved between them is never counted:
 *
 *   spent = came in + borrowed + came back + sold − bought − lent out − (pool at the month's end − pool at its start)
 *
 * Spent splits into what the records explain (card bills paid that month, EMIs in full, subscriptions not on a card, insurance not on a
 * card) and cash and UPI, the rest. A month needs a balance for every account at both ends: a savings account with none yet is held flat at
 * its first, a broker account with none makes the month "can't be worked out". A dollar account's change is taken in dollars and turned into
 * rupees at the rate on the month's last day, so a move in the rate on idle dollars is never money in or out.
 */

export const PART_KEYS = ["card", "emi", "subs", "ins", "cash"] as const;
export type PartKey = (typeof PART_KEYS)[number];

/** A payment that explains part of a month's spending. Cash and UPI is one worked-out payment on the month's last day. */
export interface ExpensePayment {
  /** Stable across renders: the kind and the record's id. */
  key: string;
  date: string;
  part: PartKey;
  amount: number;
  /** "HDFC Regalia bill", "HDFC Car Loan EMI". */
  label: string;
  /** "statement of Sep 2026", "installment 3 of 60". */
  detail?: string;
  /** The account it left, when the record says (never for cash and UPI, which is from every account). */
  accountId?: string;
  /** The card, for a card bill: its big spends sit on it. */
  cardId?: string;
}

/** A big spend in the month it counts in. A card one counts when its bill is paid; until then it's waiting. */
export interface PlacedBigSpend {
  spend: BigSpend;
  part: PartKey;
  /** The month it counts in, or null while its bill isn't paid. */
  month: MonthKey | null;
  /** The card bill it sits in (once that statement exists). */
  statementId?: string;
}

export type MonthStatus = "done" | "progress" | "unknown";

export interface AccountEnd {
  account: Account;
  /** In the account's own currency. */
  start: number;
  end: number;
  /** The change in rupees: a dollar account's at the month's rate. */
  changeInr: number;
  /** A broker account's end balance date, when it's from before the month began (carried, perhaps not updated). */
  carriedFrom?: string;
}

export interface MonthExpenses {
  month: MonthKey;
  /** done: ended and every account has both ends. progress: the month today is in. unknown: an account has no start, or there's no rate. */
  status: MonthStatus;
  /** Why it can't be worked out, for `unknown`. */
  reason?: string;
  cameIn: number;
  /** A loan disbursed into an account: its principal less what the bank kept. */
  borrowed: number;
  /** A deposit closed and paid out, and money lent coming back. */
  cameBack: number;
  sold: number;
  bought: number;
  lentOut: number;
  /** Bought − sold: what went into investments, less what came out. */
  invested: number;
  /** The records' parts. `cash` is the worked-out rest, only on a done month. */
  parts: Record<PartKey, number>;
  /** Card bills + EMIs + subscriptions + insurance: what the records explain. */
  explained: number;
  /** Everything spent, on a done month. */
  spent: number | null;
  /** The pool's change in rupees (what was kept), on a done month. Below zero when it took from savings. */
  kept: number | null;
  /** The pool at both ends, in rupees at this month's rate, on a done month. */
  poolStart: number | null;
  poolEnd: number | null;
  accounts: AccountEnd[];
  payments: ExpensePayment[];
  bigSpends: PlacedBigSpend[];
  /** The USD to INR the month's dollar change was counted at. */
  usdInr: number | null;
}

export interface ExpenseData {
  accounts: Account[];
  /** As typed: a dollar account's balances in dollars. */
  snapshots: BalanceSnapshot[];
  /** USD to INR closes, oldest first. */
  usdInr: PricePoint[];
  /** Today's rate, for the month in progress and when the saved closes run out. */
  usdInrToday: number | null;
  incomeEntries: IncomeEntry[];
  incomeSources: IncomeSource[];
  cards: Card[];
  statements: Statement[];
  subscriptions: Subscription[];
  subscriptionPayments: SubscriptionPayment[];
  loans: Loan[];
  installments: LoanInstallment[];
  prepayments: LoanPrepayment[];
  policies: Policy[];
  policyPayments: PolicyPayment[];
  trades: InvestmentTransaction[];
  fixedDeposits: FixedDeposit[];
  lentLoans: LentLoan[];
  lentRepayments: LentRepayment[];
  bigSpends: BigSpend[];
}

const inMonth = (date: string | undefined, month: MonthKey): date is string => !!date && monthOf(date) === month;
const firstDay = (month: MonthKey) => `${month}-01`;
const isDollar = (a: Pick<Account, "currency">) => a.currency === "USD";
const usable = (rate: number | null | undefined): rate is number => typeof rate === "number" && Number.isFinite(rate) && rate > 0;

/** The rate a day's dollars are counted at: the saved close on or before it, else today's. */
function rateOn(data: Pick<ExpenseData, "usdInr" | "usdInrToday">, day: string): number | null {
  const close = priceOnOrBefore(data.usdInr, day)?.close;
  return usable(close) ? close : usable(data.usdInrToday) ? data.usdInrToday : null;
}

/** A trade in rupees at its own frozen rate (a US one without one, at that day's). Null when there's no rate at all. */
function tradeInr(trade: InvestmentTransaction, data: ExpenseData): number | null {
  if (trade.market === "IND" || trade.currency === "INR") return trade.total;
  const rate = usable(trade.fxRateToInr) ? trade.fxRateToInr : rateOn(data, trade.tradeDate);
  return rate ? trade.total * rate : null;
}

/** The shares sold at an RSU vest to pay its tax (an RSU Sell on the same day and symbol as an RSU Buy), by id. They never reach him. */
function sellsToCover(trades: InvestmentTransaction[]): Set<string> {
  const vests = new Set(trades.filter((t) => t.tradeType === "Buy" && t.source === "RSU").map((t) => `${t.symbol}@${t.tradeDate}`));
  return new Set(trades.filter((t) => t.tradeType === "Sell" && t.source === "RSU" && vests.has(`${t.symbol}@${t.tradeDate}`)).map((t) => t.id));
}

/** What a disbursal put in the account: the principal less the fee, the stamp duty and the gap interest taken out of it. */
export const disbursedAmount = (loan: Loan): number => loan.principalAmount - loan.processingFee - loan.stampDuty - loan.preEmiInterest;

function earliest(snapshots: BalanceSnapshot[], accountId: string): BalanceSnapshot | null {
  let found: BalanceSnapshot | null = null;
  for (const s of snapshots) if (s.accountId === accountId && (!found || s.date < found.date)) found = s;
  return found;
}

/**
 * An account's balance at the end of a day, by the rules: nothing before it opened; its latest on or before the day; a savings account with
 * none yet held flat at its first (dormant accounts); a broker account with none yet is unknown (its cash has no history).
 */
function balanceAt(account: Account, snapshots: BalanceSnapshot[], day: string): { balance: number; date: string | null } | null {
  const latest = balanceOn(snapshots, account.id, day);
  if (latest) return { balance: latest.balance, date: latest.date };
  if (account.startDate > day) return { balance: 0, date: null };
  if (account.accountType === "Brokerage") return null;
  const first = earliest(snapshots, account.id);
  return { balance: first?.balance ?? 0, date: null };
}

/** The bill a card purchase lands in: the card's first statement dated on or after it. */
function billFor(spend: BigSpend, statements: Statement[]): Statement | null {
  let found: Statement | null = null;
  for (const s of statements) if (s.cardId === spend.paidFromCardId && s.statementDate >= spend.date && (!found || s.statementDate < found.statementDate)) found = s;
  return found;
}

/**
 * The month a statement's payment counts in: its paid day. Null while it isn't paid, and for a bill paid from another card: its money is in
 * that card's next bill, which the record doesn't tie back to it, so the big spend isn't placed in card bills that don't hold it.
 */
const paidMonth = (s: Statement): MonthKey | null => (s.status === "Paid" && s.paidDate && !s.paidFromCardId ? monthOf(s.paidDate) : null);

/** Every big spend in the month it counts in (a card one once its bill is paid), newest first. */
export function placeBigSpends(spends: BigSpend[], statements: Statement[]): PlacedBigSpend[] {
  return [...spends]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .map((spend) => {
      if (!spend.paidFromCardId) return { spend, part: "cash" as const, month: monthOf(spend.date) };
      const bill = billFor(spend, statements);
      return { spend, part: "card" as const, month: bill ? paidMonth(bill) : null, statementId: bill?.id };
    });
}

/** What every month reads, worked out once for all of them. */
export interface Prepared {
  placed: PlacedBigSpend[];
  installmentsOf: Map<string, number>;
  sellsToCover: Set<string>;
  accountIds: Set<string>;
}

export function prepare(data: ExpenseData): Prepared {
  const installmentsOf = new Map<string, number>();
  for (const i of data.installments) installmentsOf.set(i.loanId, Math.max(installmentsOf.get(i.loanId) ?? 0, i.installmentNumber));
  return { placed: placeBigSpends(data.bigSpends, data.statements), installmentsOf, sellsToCover: sellsToCover(data.trades), accountIds: new Set(data.accounts.map((a) => a.id)) };
}

/** The payments the records explain in a month, oldest first. */
function recordedPayments(data: ExpenseData, month: MonthKey, { installmentsOf }: Prepared): ExpensePayment[] {
  const out: ExpensePayment[] = [];
  const cards = new Map(data.cards.map((c) => [c.id, c]));
  for (const s of data.statements) {
    if (s.status !== "Paid" || s.paidFromCardId || !inMonth(s.paidDate, month)) continue;
    const amount = s.amountPaid ?? s.totalAmountDue;
    if (!(amount > 0)) continue;
    const card = cards.get(s.cardId);
    out.push({ key: `card:${s.id}`, date: s.paidDate, part: "card", amount, label: `${card?.alias || card?.name || "Card"} bill`, detail: `statement of ${formatMonthYear(monthOf(s.statementDate))}`, accountId: s.paidFromAccountId, cardId: s.cardId });
  }
  const loans = new Map(data.loans.map((l) => [l.id, l]));
  for (const i of data.installments) {
    const day = i.paidDate ?? i.dueDate;
    if (i.status !== "Paid" || i.paidFromCardId || !inMonth(day, month)) continue;
    const amount = i.amountPaid ?? i.totalDue;
    if (!(amount > 0)) continue;
    out.push({ key: `emi:${i.id}`, date: day, part: "emi", amount, label: `${loans.get(i.loanId)?.name ?? "Loan"} EMI`, detail: `installment ${i.installmentNumber} of ${installmentsOf.get(i.loanId)}`, accountId: i.paidFromAccountId });
  }
  for (const p of data.prepayments) {
    // An Excess-Emi prepayment is the part of an installment above the EMI, already in that installment's amount paid.
    if (p.source !== "Manual" || p.paidFromCardId || !inMonth(p.date, month)) continue;
    const amount = p.amount + (p.charge || 0);
    if (amount > 0) out.push({ key: `pre:${p.id}`, date: p.date, part: "emi", amount, label: `${loans.get(p.loanId)?.name ?? "Loan"} prepayment`, detail: p.charge ? "principal and the bank's charge" : "principal", accountId: p.paidFromAccountId });
  }
  const subscriptions = new Map(data.subscriptions.map((s) => [s.id, s]));
  for (const p of data.subscriptionPayments) {
    if (p.status !== "Paid" || !inMonth(p.paymentDate, month) || !(p.amount > 0)) continue;
    const sub = subscriptions.get(p.subscriptionId);
    // A payment charged to a card is inside that card's bill; one charged nowhere follows the subscription's usual place.
    const onCard = p.paidFromCardId || (!p.paidFromAccountId && sub?.defaultPaidFromCardId);
    if (onCard) continue;
    out.push({ key: `sub:${p.id}`, date: p.paymentDate, part: "subs", amount: p.amount, label: sub?.alias || sub?.name || "Subscription", detail: sub ? sub.billingCycle.toLowerCase() : undefined, accountId: p.paidFromAccountId ?? sub?.defaultPaidFromAccountId });
  }
  const policies = new Map(data.policies.map((p) => [p.id, p]));
  for (const p of data.policyPayments) {
    const day = p.paidOn ?? p.periodStart;
    if (p.status !== "Paid" || p.paidFromCardId || !inMonth(day, month) || !(p.amount > 0)) continue;
    const policy = policies.get(p.policyId);
    out.push({ key: `ins:${p.id}`, date: day, part: "ins", amount: p.amount, label: policy?.name ?? "Insurance", detail: p.years > 1 ? `premium for ${p.years} years` : "premium", accountId: p.paidFromAccountId });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
}

const sum = (values: number[]) => values.reduce((t, v) => t + v, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** One month's spending. `today` decides whether the month has ended. */
export function monthExpenses(data: ExpenseData, month: MonthKey, today: string, prepared = prepare(data)): MonthExpenses {
  const end = lastDayOfMonth(month);
  const startDay = lastDayOfMonth(addMonths(month, -1));
  const ended = end < today;

  const cameIn = sum(data.incomeEntries.filter((e) => e.status === "Received" && inMonth(e.receivedDate, month)).map((e) => e.amount));
  const borrowed = sum(data.loans.filter((l) => prepared.accountIds.has(l.accountId) && inMonth(l.disbursementDate, month)).map(disbursedAmount));
  const cameBack =
    sum(data.fixedDeposits.filter((d) => d.status === "Closed" && inMonth(d.closedDate, month)).map((d) => d.receivedAmount ?? 0)) +
    sum(data.lentRepayments.filter((r) => inMonth(r.date, month)).map((r) => r.amount));
  const monthTrades = data.trades.filter((t) => inMonth(t.tradeDate, month));
  const buys = monthTrades.filter((t) => t.tradeType === "Buy" && t.source === "Market");
  const sells = monthTrades.filter((t) => t.tradeType === "Sell" && !prepared.sellsToCover.has(t.id));
  const unpricedTrades = [...buys, ...sells].filter((t) => tradeInr(t, data) === null);
  const bought = sum(buys.map((t) => tradeInr(t, data) ?? 0)) + sum(data.fixedDeposits.filter((d) => inMonth(d.startDate, month)).map((d) => d.principalAmount));
  const sold = sum(sells.map((t) => tradeInr(t, data) ?? 0));
  const lentOut = sum(data.lentLoans.filter((l) => inMonth(l.startDate, month)).map((l) => l.principalAmount));

  const payments = recordedPayments(data, month, prepared);
  const parts: Record<PartKey, number> = { card: 0, emi: 0, subs: 0, ins: 0, cash: 0 };
  for (const p of payments) parts[p.part] += p.amount;
  const explained = parts.card + parts.emi + parts.subs + parts.ins;
  const bigSpends = prepared.placed.filter((b) => b.month === month);

  const base = { month, cameIn, borrowed, cameBack, sold, bought, lentOut, invested: bought - sold, parts, explained, payments, bigSpends };
  const blank = { spent: null, kept: null, poolStart: null, poolEnd: null };

  const rate = rateOn(data, ended ? end : today);
  const accounts: AccountEnd[] = [];
  const missing: string[] = [];
  for (const account of data.accounts) {
    const a = balanceAt(account, data.snapshots, startDay);
    const b = balanceAt(account, data.snapshots, ended ? end : today);
    if (!a || !b) {
      missing.push(account.name);
      continue;
    }
    const change = b.balance - a.balance;
    // Broker cash is typed by hand, so a month-end balance from before the month began is pointed out: it may not be updated. A bank's
    // balances come from its statements, and a dormant account's never change, so theirs aren't.
    const carriedFrom = account.accountType === "Brokerage" && b.date && b.date < firstDay(month) ? b.date : undefined;
    accounts.push({ account, start: a.balance, end: b.balance, changeInr: isDollar(account) ? change * (rate ?? 0) : change, carriedFrom });
  }

  if (!ended) return { ...base, ...blank, status: "progress", accounts, usdInr: rate };
  if (missing.length > 0) return { ...base, ...blank, status: "unknown", reason: `broker cash not recorded (${missing.join(", ")})`, accounts, usdInr: rate };
  if (unpricedTrades.length > 0) return { ...base, ...blank, status: "unknown", reason: `no USD to INR rate for ${unpricedTrades.map((t) => t.symbol).join(", ")} on ${unpricedTrades[0].tradeDate}`, accounts, usdInr: rate };
  if (!rate && data.accounts.some(isDollar)) return { ...base, ...blank, status: "unknown", reason: "no USD to INR rate for the month", accounts, usdInr: null };

  const inr = (a: AccountEnd, v: number) => (isDollar(a.account) ? v * (rate as number) : v);
  const poolStart = round2(sum(accounts.map((a) => inr(a, a.start))));
  const poolEnd = round2(sum(accounts.map((a) => inr(a, a.end))));
  const kept = round2(poolEnd - poolStart);
  const spent = round2(cameIn + borrowed + cameBack + sold - bought - lentOut - kept);
  const cash = round2(spent - explained);
  parts.cash = cash;
  if (cash !== 0) payments.push({ key: `cash:${month}`, date: end, part: "cash", amount: cash, label: "Cash and UPI", detail: "worked out: what no record explains" });
  return { ...base, status: "done", spent, kept, poolStart, poolEnd, accounts, usdInr: rate };
}

/** Months from `from` to `to`, oldest first. */
export function expenseMonths(data: ExpenseData, from: MonthKey, to: MonthKey, today: string): MonthExpenses[] {
  const prepared = prepare(data);
  const months: MonthExpenses[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(monthExpenses(data, m, today, prepared));
  return months;
}

/** A usual month: the average spent over the worked-out months given. Null with none. */
export function usualSpent(months: MonthExpenses[]): number | null {
  const done = months.filter((m) => m.status === "done" && m.spent !== null);
  return done.length > 0 ? sum(done.map((m) => m.spent as number)) / done.length : null;
}

/** Each part's average over the worked-out months given (the "against your usual month" grid). */
export function usualParts(months: MonthExpenses[]): Record<PartKey, number> | null {
  const done = months.filter((m) => m.status === "done");
  if (done.length === 0) return null;
  const out = { card: 0, emi: 0, subs: 0, ins: 0, cash: 0 } as Record<PartKey, number>;
  for (const key of PART_KEYS) out[key] = sum(done.map((m) => m.parts[key])) / done.length;
  return out;
}
