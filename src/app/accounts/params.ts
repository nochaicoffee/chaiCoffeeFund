import { periodSpan, totalOn } from "@/lib/aggregate/accounts";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { addMonths, monthOf, type MonthKey, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { lastMonths, monthSpanName, periodName, periodParam, QUICK_RANGES } from "@/lib/aggregate/period";
import { formatInrCompact } from "@/lib/format/money";
import type { SelectOption } from "@/components/Select";
import { CUSTOM_PERIOD, periodMenuValue, periodYears } from "../cards/params";
import { dayBefore } from "@/lib/aggregate/accounts";

/**
 * The period pill's menu on the Accounts page (#113, as on Cards and Renewals): the last 3, 6
 * and 12 months, this year and every earlier one with a balance, all time, each with how much
 * the total moved in it, then "Custom range…". Each option's value is its `?period=`.
 */

function firstBalanceDate(data: AccountsData): string | null {
  return data.snapshots.map((s) => s.date).sort()[0] ?? null;
}

function years(data: AccountsData, today: string): number[] {
  const now = Number(today.slice(0, 4));
  const start = Number((firstBalanceDate(data) ?? today).slice(0, 4));
  const list: number[] = [];
  for (let y = Math.min(start, now); y <= now; y++) list.push(y);
  return list;
}

function moved(data: AccountsData, period: SpendPeriod, today: string): number {
  const span = periodSpan(period, today, firstBalanceDate(data));
  return totalOn(data.accounts, data.snapshots, span.to) - totalOn(data.accounts, data.snapshots, dayBefore(span.from));
}

export function accountsPeriodMenu(data: AccountsData, period: SpendPeriod, today: string): SelectOption[] {
  const option = (p: SpendPeriod): SelectOption => ({ value: periodParam(p, today) ?? "", label: periodName(p, today), meta: formatInrCompact(moved(data, p, today)) });
  const quick = QUICK_RANGES.map((n, i) => ({ ...option(lastMonths(n, today)), group: i === 0 ? "Quick ranges" : undefined }));
  const list = periodYears(years(data, today), period).map((year, i) => ({ ...option({ kind: "year", year }), divider: i === 0 }));
  const custom: SelectOption =
    period.kind === "range" && !period.last
      ? { value: CUSTOM_PERIOD, label: "Custom range", meta: monthSpanName(period.from, period.to), display: periodName(period, today), action: true, divider: true }
      : { value: CUSTOM_PERIOD, label: "Custom range…", action: true, divider: true };
  return [...quick, ...list, option({ kind: "all" }), custom];
}

export { periodMenuValue as accountsPeriodValue };

/** Where the month picker opens: the period's months up to this one, and January of the first balance's year as the earliest. */
export function accountsRangeStart(data: AccountsData, period: SpendPeriod, today: string): { from: MonthKey; to: MonthKey; earliest: MonthKey } {
  const current = monthOf(today);
  const earliest = `${years(data, today)[0]}-01`;
  const later = (a: MonthKey, b: MonthKey) => (a > b ? a : b);
  const fallback = { from: later(addMonths(current, -5), earliest), to: current, earliest };
  if (period.kind === "all") return fallback;
  const span = periodSpan(period, today, firstBalanceDate(data));
  const start = later(monthOf(span.from), earliest);
  const end = monthOf(span.to) < current ? monthOf(span.to) : current;
  return start > end ? fallback : { from: start, to: end, earliest };
}
