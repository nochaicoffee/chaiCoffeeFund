import { cameInBySource, comingUp, everythingElse, flows, monthlyFlows, moneyItems, monthsIn, OUT_KINDS, type AccountsData } from "@/lib/aggregate/accountFlows";
import { accountColor, balanceOn, changeSince, dayBefore, isClosed, periodSpan, totalOn } from "@/lib/aggregate/accounts";
import type { SpendPeriod } from "@/lib/aggregate/cardSpend";
import { periodName } from "@/lib/aggregate/period";
import { formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { cardColorKey, whenFrom, type ColorKey } from "@/lib/format/subscriptionLabels";

/**
 * What sits under the hero for one pick (docs/design/accounts.md, "The final design"): this
 * year in and out, Over time (the glow line, River and Bridge), Money in and out by month, and
 * Coming up. Plain, already-formatted data from lib/aggregate/accountFlows.ts, which does the
 * work; every figure that comes from other pages' records is marked "worked out".
 */

const MAX_MONTHS = 24;
const lastDay = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

export interface InOutTile {
  label: string;
  value: string;
  note?: string;
  tone?: "positive" | "negative";
}

export interface MonthColumn {
  key: string;
  label: string;
  cameIn: number;
  expenses: number;
  invested: number;
  saved: number;
  savedText: string;
}

export interface OverTimeMonth {
  key: string;
  label: string;
  total: number;
  /** What the total moved that month. */
  change: number;
  /** Each account's balance at the month's end, for River. */
  parts: { id: string; name: string; color: ColorKey; balance: number }[];
}

export interface BridgeStep {
  label: string;
  amount: number;
  text: string;
  /** "start" and "end" are totals; the rest move it. */
  kind: "total" | "up" | "down";
  /** The step that is the remainder the records don't explain. */
  worked?: boolean;
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
  tiles: InOutTile[];
  /** What came in, split by source, for the one bar. */
  split: { source: string; amount: number; text: string; share: number }[];
  columns: MonthColumn[];
  overTime: { months: OverTimeMonth[]; bridge: BridgeStep[]; river: boolean };
  coming: ComingItemView[];
  /** Whether anything is recorded in the period to draw, so a quiet pick shows a plain note instead of empty charts. */
  hasFlows: boolean;
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatInr(Math.abs(n))}`;

export function detailFor(data: AccountsData, accountId: string | null, period: SpendPeriod, today: string): PickDetail {
  const scope = data.accounts.filter((a) => accountId === null || a.id === accountId);
  const firstDate = data.snapshots.filter((s) => scope.some((a) => a.id === s.accountId)).map((s) => s.date).sort()[0] ?? null;
  const span = periodSpan(period, today, firstDate);
  const items = moneyItems(data, span.from, span.to);
  const f = flows(items, accountId);
  const allMonths = monthsIn(span.from, span.to);
  const months = allMonths.slice(-MAX_MONTHS);
  const split = cameInBySource(data, span.from, span.to, accountId);
  const name = periodName(period, today);

  const tiles: InOutTile[] = [
    { label: "Came in", value: formatInr(f.cameIn), note: "Income received" },
    { label: "Expenses", value: formatInr(f.expenses), note: "Card bills, subscriptions, EMIs" },
    { label: "Invested", value: formatInr(f.invested), note: "Shares bought" },
    { label: "Saved", value: signed(f.saved), note: f.invested > 0 ? `${formatInr(f.keptInBank)} kept in the bank` : "Came in less expenses", tone: f.saved >= 0 ? "positive" : "negative" },
  ];

  const columns = monthlyFlows(items, accountId, months).map(({ month, flows: m }): MonthColumn => ({
    key: month,
    label: formatMonthShort(month),
    cameIn: m.cameIn,
    expenses: m.expenses,
    invested: m.invested,
    saved: m.saved,
    savedText: signed(m.saved),
  }));

  const overMonths = months.map((month, i): OverTimeMonth => {
    const end = lastDay(month) > span.to ? span.to : lastDay(month);
    const prevEnd = i === 0 ? dayBefore(span.from) : lastDay(months[i - 1]);
    return {
      key: month,
      label: formatMonthShort(month),
      total: totalOn(scope, data.snapshots, end),
      change: changeSince(scope, data.snapshots, prevEnd, end),
      parts: scope
        .map((a) => ({ id: a.id, name: a.name, color: cardColorKey(accountColor(a)), balance: balanceOn(data.snapshots, a.id, end)?.balance ?? 0 }))
        .filter((p) => p.balance > 0),
    };
  });

  const rest = everythingElse(data, items, accountId, span.from, span.to);
  const start = totalOn(scope, data.snapshots, dayBefore(span.from));
  const bridge: BridgeStep[] = [{ label: "Start", amount: start, text: formatInr(start), kind: "total" }];
  const step = (label: string, amount: number, worked = false) => {
    if (amount !== 0) bridge.push({ label, amount, text: signed(amount), kind: amount > 0 ? "up" : "down", worked });
  };
  step("Came in", f.cameIn);
  step("Sold", f.sold);
  for (const kind of OUT_KINDS) step(kind, -f.out[kind]);
  step("Everything else", rest.unexplained, true);
  // An account first read inside the period arrives with its balance, which isn't money moving: its own step, so the bridge ends on what's held.
  const end = totalOn(scope, data.snapshots, span.to);
  step("Accounts opened", end - (start + rest.change));
  bridge.push({ label: "Now", amount: end, text: formatInr(end), kind: "total" });

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
    tiles,
    split: split.map((s) => ({ ...s, text: formatInrCompact(s.amount), share: f.cameIn > 0 ? s.amount / f.cameIn : 0 })),
    columns,
    overTime: { months: overMonths, bridge, river: accountId === null && scope.length > 1 },
    coming,
    hasFlows: items.some((i) => accountId === null || i.accountId === accountId),
  };
}
