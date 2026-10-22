import { bridgeSteps, cameInBySource, comingUp, flows, monthlyFlows, moneyItems, type AccountsData, type BridgeStep as LibBridgeStep, type MoneyItem } from "@/lib/aggregate/accountFlows";
import { accountColor, isClosed, lastMonthsOfSpan, monthEnds, monthsBetween, periodSpan } from "@/lib/aggregate/accounts";
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

export interface BridgeStep extends LibBridgeStep {
  text: string;
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

  const accountsById = new Map(scope.map((a) => [a.id, a]));
  const overMonths = monthEnds(scope, data.snapshots, span).map(
    (m): OverTimeMonth => ({
      key: m.month,
      label: formatMonthShort(m.month),
      total: m.total,
      change: m.change,
      // Only All draws River, so a single account carries no parts.
      parts: accountId === null ? m.parts.map((p) => ({ id: p.accountId, name: accountsById.get(p.accountId)!.name, color: cardColorKey(accountColor(accountsById.get(p.accountId)!)), balance: p.balance })) : [],
    }),
  );

  const bridge: BridgeStep[] = bridgeSteps(data, items, accountId, span).map((b) => ({ ...b, text: b.kind === "total" ? formatInr(b.amount) : signed(b.amount) }));

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
