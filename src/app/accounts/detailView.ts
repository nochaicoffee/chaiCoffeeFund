import { cameInTile, investedTile, leftTile, spentTile } from "./investedTile";
import { incomeShares, investedShares, leftShares, spentShares, type MoneyShare } from "./moneyShares";
import { cameInBySource, comingUp, everythingElse, flows, monthlyFlows, moneyItems, type AccountsData, type MoneyItem } from "@/lib/aggregate/accountFlows";
import { accountColor, dayBefore, isClosed, lastDayOfMonth, lastMonthsOfSpan, monthsBetween, periodSpan, totalOn } from "@/lib/aggregate/accounts";
import type { SpendPeriod } from "@/lib/aggregate/cardSpend";
import { periodName } from "@/lib/aggregate/period";
import { formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { cardColorKey, whenFrom, type ColorKey } from "@/lib/format/subscriptionLabels";

/**
 * What sits under the hero for one pick (docs/design/accounts.md, "The money section"): the four
 * answers (what came in, what was spent, what was invested, what was left in the bank), the months
 * behind each, and Coming up. Plain, already-formatted data from lib/aggregate/accountFlows.ts, which
 * does the work; every figure that comes from other pages' records is marked "worked out".
 */

export interface MoneyAnswer {
  label: string;
  value: string;
  note?: string;
  /** A line under the rows, where the tile has one. */
  footnote?: string;
  tone?: "positive" | "negative";
  /** What the figure is made of: the rows under it, and the parts of its bar. */
  shares: MoneyShare[];
}

/**
 * One month of the money section. The recorded parts come from the records kept elsewhere; `cashUpi` is the bank accounts'
 * balance change that nothing records (negative: money out), and `left` is their real change that month, from recorded balances.
 */
export interface MoneyMonth {
  key: string;
  label: string;
  /** The full month name and year, for the hover card. */
  name: string;
  cameIn: number;
  /** Loans paid in that month: apart from came in, since it isn't income. */
  borrowed: number;
  cardBills: number;
  emis: number;
  bigSpends: number;
  subscriptions: number;
  cashUpi: number;
  /** Sent to brokers, and what they sent back. */
  sent: number;
  takenBack: number;
  /** Lent to people less paid back that month. */
  lent: number;
  left: number;
}

export interface ComingItemView {
  key: string;
  kind: string;
  label: string;
  account: string;
  dateText: string;
  when: string;
  amountText: string;
  about: boolean;
  short: boolean;
  color: ColorKey;
}

export interface PickDetail {
  periodName: string;
  /** Came in, Spent, Invested, In the bank now. */
  answers: MoneyAnswer[];
  months: MoneyMonth[];
  coming: ComingItemView[];
  /** Whether anything is recorded in the period to draw, so a quiet pick shows a plain note instead of empty charts. */
  hasFlows: boolean;
}


/** Money items by span, shared by every pick of one page build so each span is worked out once. */
export type ItemsCache = Map<string, MoneyItem[]>;

export function detailFor(data: AccountsData, accountId: string | null, period: SpendPeriod, today: string, cache: ItemsCache = new Map()): PickDetail {
  const scope = data.accounts.filter((a) => accountId === null || a.id === accountId);
  const firstDate = data.snapshots.filter((s) => scope.some((a) => a.id === s.accountId)).map((s) => s.date).sort()[0] ?? null;
  // A long period is cut to its last 24 months for everything here, so the tiles, the bridge and the charts cover the same days.
  const span = lastMonthsOfSpan(periodSpan(period, today, firstDate));
  const key = `${span.from}..${span.to}`;
  const items = cache.get(key) ?? moneyItems(data, span.from, span.to);
  cache.set(key, items);
  const f = flows(items, accountId);
  const months = monthsBetween(span.from, span.to);
  const name = periodName(period, today);

  // What the bank accounts hold is a bank's story (UPI, cash, the card bills paid from it), so a broker's own balance, which moves with
  // the market, never counts toward what was left or what went with no record.
  const banks = { ...data, accounts: data.accounts.filter((a) => a.accountType !== "Brokerage" && (accountId === null || a.id === accountId)) };
  const rest = everythingElse(banks, items, accountId, span.from, span.to);

  const monthRows = monthlyFlows(items, accountId, months).map(({ month, flows: m }): MoneyMonth => {
    // A month is worked out on its own days: its items, and the balances at its two ends (the first month from the span's first day).
    const from = `${month}-01` < span.from ? span.from : `${month}-01`;
    const last = lastDayOfMonth(month);
    const to = last > span.to ? span.to : last;
    const monthRest = everythingElse(banks, items.filter((i) => i.date >= from && i.date <= to), accountId, from, to);
    return {
      key: month,
      label: formatMonthShort(month),
      name: formatMonthYear(month),
      cameIn: m.cameIn,
      borrowed: m.borrowed,
      cardBills: m.out["Card bills"],
      emis: m.out.EMIs,
      bigSpends: m.out["Big spends"],
      subscriptions: m.out.Subscriptions,
      cashUpi: monthRest.unexplained,
      sent: m.sent,
      takenBack: m.takenBack,
      lent: m.lent,
      left: monthRest.change,
    };
  });

  const cashOut = Math.max(0, -rest.unexplained);
  const start = totalOn(banks.accounts, data.snapshots, dayBefore(span.from));
  const end = totalOn(banks.accounts, data.snapshots, span.to);
  const answers: MoneyAnswer[] = [
    { ...cameInTile(f), shares: incomeShares(cameInBySource(data, span.from, span.to, accountId), f.borrowed) },
    { ...spentTile(f, rest.unexplained), shares: spentShares(f, cashOut) },
    { ...investedTile(f), shares: investedShares(f) },
    { ...leftTile(rest.change, rest.unexplained, { start, end, from: span.from }), shares: leftShares(f) },
  ];

  const names = new Map(data.accounts.map((a) => [a.id, a]));
  const coming = comingUp(data, accountId, today).filter((c) => {
    const account = names.get(c.accountId);
    return account !== undefined && !isClosed(account);
  }).map((c, i): ComingItemView => ({
    key: `${c.kind}-${c.date}-${c.label}-${i}`,
    kind: c.kind,
    label: c.label,
    account: names.get(c.accountId)?.name ?? "",
    dateText: formatShortDate(c.date),
    when: whenFrom(today, c.date),
    amountText: `${c.kind === "Salary" ? "+" : "−"}${formatInr(c.amount)}`,
    about: c.about,
    short: c.short,
    color: cardColorKey(names.get(c.accountId) ? accountColor(names.get(c.accountId)!) : undefined),
  }));

  return {
    periodName: name,
    answers,
    months: monthRows,
    coming,
    hasFlows: items.some((i) => accountId === null || i.accountId === accountId) || rest.unexplained !== 0,
  };
}
