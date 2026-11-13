import { formatMonthYear } from "../format/date";
import { balanceOn, lastDayOfMonth } from "./accounts";
import { netDisbursedAmount, paidIntoAccount } from "./loans";
import { addMonths, monthOf, type MonthKey } from "./cardSpend";
import { priceOnOrBefore } from "../prices/history";
import type { PricePoint } from "../prices/history";
import type {
  Account,
  BalanceSnapshot,
  BigSpend,
  BigSpendCategory,
  Card,
  FixedDeposit,
  IncomeEntry,
  IncomeSource,
  LentLoan,
  LentRepayment,
  Loan,
  LoanInstallment,
  LoanPrepayment,
  Policy,
  PolicyPayment,
  Goal,
  Statement,
  Subscription,
  SubscriptionPayment,
  Transfer,
} from "../sheets/types";

/**
 * What he spent each month (docs/design/expenses.md, "The calculation: the pool" and "Build decisions"). Pure.
 *
 * The pool is his bank accounts, every one that isn't a Brokerage account, so money moved between them is never counted. A broker's cash
 * has no balance history (it is typed in by hand), so brokers are met through the Transfers instead, the same rule as Accounts: money sent
 * from a bank to a broker leaves the pool, money a broker sent back enters it, and what happens inside the broker (trades, dividends) never
 * touches the bank.
 *
 *   spent = came in + borrowed + came back + taken back − sent to brokers − new deposits − lent out − (pool at the month's end − pool at its start)
 *
 * Spent splits into what the records explain (card bills paid that month, EMIs in full, subscriptions not on a card, insurance not on a
 * card) and cash and UPI, the rest. A month needs a balance for every bank account at both ends: one with none yet is held flat at its
 * first. A dollar bank account's change is taken in dollars and turned into rupees at the rate on the month's last day, so a move in the
 * rate on idle dollars is never money in or out.
 */

export const PART_KEYS = ["card", "emi", "subs", "ins", "big", "cash"] as const;
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
  /** Money a broker sent back to a bank account (a Transfer), profit and all. */
  sold: number;
  /** Money sent from a bank account to a broker (a Transfer), and new deposits. */
  bought: number;
  lentOut: number;
  /** Bought − sold: what went into investing, less what came back. */
  invested: number;
  /** The records' parts. `cash` is the worked-out rest, only on a done month. A big spend paid from an account is `big`. */
  parts: Record<PartKey, number>;
  /** Card bills + EMIs + subscriptions + insurance + big spends paid from an account: what the records explain. */
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
  /** Money moved between his accounts: a bank and a broker, either way, is what counts here. */
  transfers: Transfer[];
  fixedDeposits: FixedDeposit[];
  lentLoans: LentLoan[];
  lentRepayments: LentRepayment[];
  bigSpends: BigSpend[];
  /** A goal marked bought counts as a big spend, under its own name (Accounts counts it the same way). */
  goals: Goal[];
}

const inMonth = (date: string | undefined, month: MonthKey): date is string => !!date && monthOf(date) === month;
const isDollar = (a: Pick<Account, "currency">) => a.currency === "USD";
const usable = (rate: number | null | undefined): rate is number => typeof rate === "number" && Number.isFinite(rate) && rate > 0;

/** The rate a day's dollars are counted at: the saved close on or before it, else today's. */
function rateOn(data: Pick<ExpenseData, "usdInr" | "usdInrToday">, day: string): number | null {
  const close = priceOnOrBefore(data.usdInr, day)?.close;
  return usable(close) ? close : usable(data.usdInrToday) ? data.usdInrToday : null;
}

/** The pool: every account but a broker's. */
const inPool = (a: Pick<Account, "accountType">) => a.accountType !== "Brokerage";

/**
 * A transfer's bank side, when it is between a bank account and a Brokerage account: what left the bank for a broker (`out`) or what a
 * broker's money became in the bank (`back`), in rupees. A transfer between two banks nets out inside the pool, and one between two
 * brokers never touches it.
 */
function bankSide(t: Transfer, accounts: Map<string, Account>, rate: number | null): { kind: "out" | "back"; inr: number } | null {
  const from = accounts.get(t.fromAccountId);
  const to = accounts.get(t.toAccountId);
  if (!from || !to || inPool(from) === inPool(to)) return null;
  const inrOf = (a: Account, amount: number) => (isDollar(a) ? amount * (rate ?? 0) : amount);
  return inPool(from) ? { kind: "out", inr: inrOf(from, t.amount) } : { kind: "back", inr: inrOf(to, t.receivedAmount ?? t.amount) };
}

/** What a disbursal put in the account: the principal less the fee, the stamp duty and the gap interest taken out of it. */
export const disbursedAmount = (loan: Loan): number => netDisbursedAmount(loan);

function earliest(snapshots: BalanceSnapshot[], accountId: string): BalanceSnapshot | null {
  let found: BalanceSnapshot | null = null;
  for (const s of snapshots) if (s.accountId === accountId && (!found || s.date < found.date)) found = s;
  return found;
}

/**
 * A bank account's balance at the end of a day, by the rules: nothing before it opened; its latest on or before the day; one with none yet
 * held flat at its first (dormant accounts).
 */
function balanceAt(account: Account, snapshots: BalanceSnapshot[], day: string): number {
  const latest = balanceOn(snapshots, account.id, day);
  if (latest) return latest.balance;
  if (account.startDate > day) return 0;
  return earliest(snapshots, account.id)?.balance ?? 0;
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

const GOAL_TO_BIG: Partial<Record<Goal["category"], BigSpendCategory>> = { Vehicle: "Vehicle", Home: "Home", Travel: "Travel", Education: "Education", Health: "Health" };

/** A goal marked bought (Done, with its day, cost and where it was paid from) as the big spend it is, so it counts like one typed in. */
export function goalBigSpends(goals: Goal[]): BigSpend[] {
  return goals
    .filter((g) => g.status === "Done" && g.doneOn && (g.actualCost ?? 0) > 0 && (g.paidFromAccountId || g.paidFromCardId))
    .map((g) => ({ id: `goal:${g.id}`, date: g.doneOn as string, amount: g.actualCost as number, name: g.name, category: GOAL_TO_BIG[g.category] ?? "Other", paidFromAccountId: g.paidFromAccountId, paidFromCardId: g.paidFromCardId, note: "A goal marked bought" }));
}

/**
 * Every big spend in the month it counts in (a card one once its bill is paid), newest first. One paid from a bank account is a payment of
 * its own (part `big`), since the records name it; one that names no account stays inside cash and UPI, where nothing else explains it.
 */
export function placeBigSpends(spends: BigSpend[], statements: Statement[]): PlacedBigSpend[] {
  return [...spends]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .map((spend) => {
      if (!spend.paidFromCardId) return { spend, part: spend.paidFromAccountId ? ("big" as const) : ("cash" as const), month: monthOf(spend.date) };
      const bill = billFor(spend, statements);
      return { spend, part: "card" as const, month: bill ? paidMonth(bill) : null, statementId: bill?.id };
    });
}

/** What every month reads, worked out once for all of them. */
export interface Prepared {
  placed: PlacedBigSpend[];
  installmentsOf: Map<string, number>;
  accountIds: Set<string>;
  accounts: Map<string, Account>;
}

export function prepare(data: ExpenseData): Prepared {
  const installmentsOf = new Map<string, number>();
  for (const i of data.installments) installmentsOf.set(i.loanId, Math.max(installmentsOf.get(i.loanId) ?? 0, i.installmentNumber));
  return { placed: placeBigSpends([...data.bigSpends, ...goalBigSpends(data.goals ?? [])], data.statements), installmentsOf, accountIds: new Set(data.accounts.map((a) => a.id)), accounts: new Map(data.accounts.map((a) => [a.id, a])) };
}

/** The payments the records explain in a month, oldest first. */
function recordedPayments(data: ExpenseData, month: MonthKey, { installmentsOf, placed }: Prepared): ExpensePayment[] {
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
  for (const b of placed) {
    if (b.part !== "big" || b.month !== month || !(b.spend.amount > 0)) continue;
    out.push({ key: `big:${b.spend.id}`, date: b.spend.date, part: "big", amount: b.spend.amount, label: b.spend.name, detail: b.spend.category.toLowerCase(), accountId: b.spend.paidFromAccountId });
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
  const borrowed = sum(data.loans.filter((l) => paidIntoAccount(l) && prepared.accountIds.has(l.accountId) && inMonth(l.disbursementDate, month)).map(disbursedAmount));
  const cameBack =
    sum(data.fixedDeposits.filter((d) => d.status === "Closed" && inMonth(d.closedDate, month)).map((d) => d.receivedAmount ?? 0)) +
    sum(data.lentRepayments.filter((r) => inMonth(r.date, month)).map((r) => r.amount));
  const rate = rateOn(data, ended ? end : today);
  const sides = data.transfers.filter((t) => inMonth(t.date, month)).map((t) => bankSide(t, prepared.accounts, rate)).filter((x) => x !== null);
  const sent = sum(sides.filter((x) => x.kind === "out").map((x) => x.inr));
  const sold = sum(sides.filter((x) => x.kind === "back").map((x) => x.inr));
  const bought = sent + sum(data.fixedDeposits.filter((d) => inMonth(d.startDate, month)).map((d) => d.principalAmount));
  const lentOut = sum(data.lentLoans.filter((l) => inMonth(l.startDate, month)).map((l) => l.principalAmount));

  const payments = recordedPayments(data, month, prepared);
  const parts: Record<PartKey, number> = { card: 0, emi: 0, subs: 0, ins: 0, big: 0, cash: 0 };
  for (const p of payments) parts[p.part] += p.amount;
  const explained = parts.card + parts.emi + parts.subs + parts.ins + parts.big;
  const bigSpends = prepared.placed.filter((b) => b.month === month);

  const base = { month, cameIn, borrowed, cameBack, sold, bought, lentOut, invested: bought - sold, parts, explained, payments, bigSpends };
  const blank = { spent: null, kept: null, poolStart: null, poolEnd: null };

  const accounts: AccountEnd[] = [];
  for (const account of data.accounts.filter(inPool)) {
    const start = balanceAt(account, data.snapshots, startDay);
    const finish = balanceAt(account, data.snapshots, ended ? end : today);
    const change = finish - start;
    accounts.push({ account, start, end: finish, changeInr: isDollar(account) ? change * (rate ?? 0) : change });
  }

  if (!ended) return { ...base, ...blank, status: "progress", accounts, usdInr: rate };
  if (!rate && accounts.some((a) => isDollar(a.account))) return { ...base, ...blank, status: "unknown", reason: "no USD to INR rate for the month", accounts, usdInr: null };

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

export interface ExpenseTotals {
  months: number;
  cameIn: number;
  invested: number;
  lentOut: number;
  kept: number;
  spent: number;
  parts: Record<PartKey, number>;
}

/** The worked-out months added up (the months table's last row). Came in counts a disbursal and what came back, as the page does. */
export function totalsOf(months: MonthExpenses[]): ExpenseTotals {
  const done = months.filter((m) => m.status === "done");
  const parts = { card: 0, emi: 0, subs: 0, ins: 0, big: 0, cash: 0 } as Record<PartKey, number>;
  for (const key of PART_KEYS) parts[key] = sum(done.map((m) => m.parts[key]));
  return {
    months: done.length,
    cameIn: sum(done.map((m) => m.cameIn + m.borrowed + m.cameBack)),
    invested: sum(done.map((m) => m.invested)),
    lentOut: sum(done.map((m) => m.lentOut)),
    kept: sum(done.map((m) => m.kept ?? 0)),
    spent: sum(done.map((m) => m.spent ?? 0)),
    parts,
  };
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
  const out = { card: 0, emi: 0, subs: 0, ins: 0, big: 0, cash: 0 } as Record<PartKey, number>;
  for (const key of PART_KEYS) out[key] = sum(done.map((m) => m.parts[key])) / done.length;
  return out;
}
