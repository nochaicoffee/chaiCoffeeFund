import type { DailyBudget, DailySpend, DailySpendMethod } from "../sheets/types";

/**
 * The Daily page's math (docs/design/daily.md). Pure: the hand-written spends in, a month's or a year's figures out. Amounts are rupees, summed in paise so
 * a column of ₹10.10s adds up to what it should. Nothing here reads Expenses, Cards or Accounts: the diary is its own thing.
 *
 * The diary starts on the day of its first spend: a day before that isn't a quiet day, it's a day he wasn't keeping it, so it counts toward nothing
 * (quiet days, a day's average, a run under the allowance).
 */

/** The month a date is in: "2026-11-18" → "2026-11". */
export const monthOf = (date: string): string => date.slice(0, 7);

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** A `?month=` value if it is a real month, else undefined. */
export const readMonth = (value: string | undefined): string | undefined => (value && MONTH_PATTERN.test(value) ? value : undefined);

/** The month before or after: "2026-01", -1 → "2025-12". */
export function shiftMonth(month: string, by: number): string {
  const total = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** How many days a month has (leap years included). */
export function daysInMonth(month: string): number {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
}

const paise = (rupees: number) => Math.round(rupees * 100);
const rupees = (p: number) => p / 100;

/** What was spent over some spends, in rupees, split by how it was paid. Cash is 0 until a spend is written down as cash. */
export interface MethodTotals {
  total: number;
  upi: number;
  card: number;
  cash: number;
}

function totalsOf(spends: readonly DailySpend[]): MethodTotals {
  let upi = 0;
  let card = 0;
  let cash = 0;
  for (const s of spends) {
    if (s.method === "UPI") upi += paise(s.amount);
    else if (s.method === "Cash") cash += paise(s.amount);
    else card += paise(s.amount);
  }
  return { total: rupees(upi + card + cash), upi: rupees(upi), card: rupees(card), cash: rupees(cash) };
}

/** The day of the first spend written down, or null for an empty diary. */
export function diaryStart(spends: readonly DailySpend[]): string | null {
  return spends.reduce<string | null>((first, s) => (first === null || s.date < first ? s.date : first), null);
}

export interface DayRow extends MethodTotals {
  date: string;
  /** The day of the month, 1 to 31. */
  day: number;
  /** In the order they were added. */
  spends: DailySpend[];
  /** Today or before (a day to come isn't counted). */
  elapsed: boolean;
  /** Elapsed and on or after the diary's first day: a day he was keeping it. */
  kept: boolean;
}

export interface WeekRow extends MethodTotals {
  /** First and last day of the month this week holds (a week is Monday to Sunday). */
  from: string;
  to: string;
  /** Monday first: seven cells, null before the 1st and after the last day. */
  cells: (DayRow | null)[];
  inProgress: boolean;
}

export interface CategoryRow {
  /** A category's id, or null: spends written down without one. */
  category: string | null;
  amount: number;
  /** Of the month's spending, 0 to 1. */
  share: number;
}

export interface MonthView extends MethodTotals {
  month: string;
  /** How many spends were written down. */
  count: number;
  /** Every day of the month, earliest first (a day to come is there, marked). */
  days: DayRow[];
  weeks: WeekRow[];
  /** Days of the month gone by, counting today: 0 in a month to come, all of it in one that's over. */
  elapsed: number;
  /** Of those, the days the diary was being kept. */
  daysCounted: number;
  /** The month's spending per counted day; 0 when no day is counted. */
  perDay: number;
  /** Counted days with nothing written down. */
  quietDays: number;
  /** The most expensive day, or null when nothing was spent. */
  biggestDay: { date: string; total: number } | null;
  /** Biggest first, with the uncategorised last. */
  categories: CategoryRow[];
  /** The current month only: what the month comes to if the rest of it goes like the days so far. Null in a past or future month, or before any spend. */
  pace: number | null;
  isCurrent: boolean;
  isFuture: boolean;
  length: number;
}

/** One month, from every spend written down (those in other months are ignored). `today` is YYYY-MM-DD. */
export function monthView(spends: readonly DailySpend[], month: string, today: string): MonthView {
  const inMonth = spends.filter((s) => monthOf(s.date) === month);
  const start = diaryStart(spends);
  const thisMonth = monthOf(today);
  const isCurrent = month === thisMonth;
  const isFuture = month > thisMonth;
  const length = daysInMonth(month);
  const elapsed = isFuture ? 0 : isCurrent ? Number(today.slice(8, 10)) : length;

  const days: DayRow[] = [];
  for (let d = 1; d <= length; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const spendsThatDay = inMonth.filter((s) => s.date === date);
    days.push({ date, day: d, spends: spendsThatDay, ...totalsOf(spendsThatDay), elapsed: d <= elapsed, kept: d <= elapsed && start !== null && date >= start });
  }

  const totals = totalsOf(inMonth);
  const kept = days.filter((d) => d.kept);
  const daysCounted = kept.length;
  const quietDays = kept.filter((d) => d.spends.length === 0).length;
  const biggest = kept.reduce<DayRow | null>((best, d) => (d.total > (best?.total ?? 0) ? d : best), null);

  const byCategory = new Map<string | null, number>();
  for (const s of inMonth) byCategory.set(s.category ?? null, (byCategory.get(s.category ?? null) ?? 0) + paise(s.amount));
  const categories = [...byCategory]
    .map(([category, p]) => ({ category, amount: rupees(p), share: totals.total > 0 ? rupees(p) / totals.total : 0 }))
    // Biggest first, but the spends with no category go last however much they are.
    .sort((a, b) => (a.category === null ? 1 : b.category === null ? -1 : b.amount - a.amount));

  const perDay = daysCounted > 0 ? Math.round((totals.total / daysCounted) * 100) / 100 : 0;
  // No pace without a day to take it from: a spend dated after today with nothing before it leaves no day counted.
  const pace = isCurrent && totals.total > 0 && daysCounted > 0 ? Math.round(totals.total + (totals.total / daysCounted) * (length - elapsed)) : null;

  // Monday-first weeks: the 1st of a Sunday month sits after six blanks.
  const lead = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (DayRow | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks: WeekRow[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    const real = row.filter((c): c is DayRow => c !== null);
    const sums = totalsOf(real.flatMap((c) => c.spends));
    weeks.push({ from: real[0].date, to: real[real.length - 1].date, cells: row, ...sums, inProgress: real.some((c) => c.date === today) });
  }

  return { month, ...totals, count: inMonth.length, days, weeks, elapsed, daysCounted, perDay, quietDays, biggestDay: biggest ? { date: biggest.date, total: biggest.total } : null, categories, pace, isCurrent, isFuture, length };
}

// ---------- The monthly limit ----------

/** The limit a month has: the latest row at or before it, or null when no row reaches back that far. */
export function limitFor(budgets: readonly DailyBudget[], month: string): number | null {
  let best: DailyBudget | null = null;
  for (const b of budgets) if (b.month <= month && (best === null || b.month > best.month)) best = b;
  return best?.limit ?? null;
}

export interface BudgetView {
  limit: number;
  /** What's left of the limit; below zero when it's been passed. */
  left: number;
  /** Spent over the limit, 0 to 1 and beyond. */
  used: number;
  /** What the month's spending should be by today to stay on a straight line to the limit. */
  expected: number;
  /** Spent less expected: above zero is over the pace. */
  overPace: number;
  over: boolean;
  /** Days left after today. */
  daysLeft: number;
  /** The current month only, else null. */
  today: {
    /** Spent today. */
    spent: number;
    /** What's left of the limit before today, shared over the days to go counting today. It moves as he spends. */
    allowance: number;
    /** The allowance less today's spending: below zero when today is past it. */
    left: number;
  } | null;
  /** The week in progress (Monday to Sunday) against its share of the limit, the current month only. */
  week: { from: string; to: string; spent: number; share: number } | null;
}

/** A month against its limit. The allowance and the week need a current month (they're about today); a past month has the plain figures only. */
export function budgetView(view: MonthView, limit: number, today: string): BudgetView {
  const left = Math.round((limit - view.total) * 100) / 100;
  const expected = Math.round((limit * view.elapsed) / view.length);
  const daysLeft = Math.max(0, view.length - view.elapsed);
  let todayBlock: BudgetView["today"] = null;
  let week: BudgetView["week"] = null;
  if (view.isCurrent) {
    const spent = view.days.find((d) => d.date === today)?.total ?? 0;
    const allowance = Math.round(Math.max(0, limit - (view.total - spent)) / (daysLeft + 1));
    todayBlock = { spent, allowance, left: allowance - spent };
    const w = view.weeks.find((x) => x.inProgress);
    if (w) week = { from: w.from, to: w.to, spent: w.total, share: Math.round((limit * 7) / view.length) };
  }
  return { limit, left, used: view.total / limit, expected, overPace: Math.round((view.total - expected) * 100) / 100, over: left < 0, daysLeft, today: todayBlock, week };
}

// ---------- Months, and a period of them ----------

export interface MonthRow extends MethodTotals {
  month: string;
  count: number;
}

/**
 * The months for "Month by month": the `count` months up to and including the later of today's month and the picked one, newest first,
 * each with what was spent. A month with nothing written down is still a row (with ₹0), so a gap shows as a gap.
 */
export function monthRows(spends: readonly DailySpend[], today: string, picked: string, count = 6): MonthRow[] {
  const last = picked > monthOf(today) ? picked : monthOf(today);
  const rows: MonthRow[] = [];
  for (let i = 0; i < count; i++) {
    const month = shiftMonth(last, -i);
    const of = spends.filter((s) => monthOf(s.date) === month);
    rows.push({ month, count: of.length, ...totalsOf(of) });
  }
  return rows;
}

/** The usual month: the average of the earlier months that have a spend written down, or null when none do. Today's month is left out, it isn't over. */
export function usualMonth(spends: readonly DailySpend[], today: string): MethodTotals | null {
  const thisMonth = monthOf(today);
  const months = [...new Set(spends.map((s) => monthOf(s.date)).filter((m) => m < thisMonth))];
  if (months.length === 0) return null;
  const sums = months.map((m) => totalsOf(spends.filter((s) => monthOf(s.date) === m)));
  const mean = (pick: (t: MethodTotals) => number) => Math.round(sums.reduce((a, t) => a + pick(t), 0) / sums.length);
  return { total: mean((t) => t.total), upi: mean((t) => t.upi), card: mean((t) => t.card), cash: mean((t) => t.cash) };
}

/** What went on one method. */
export const methodAmount = (totals: MethodTotals, method: DailySpendMethod): number => (method === "UPI" ? totals.upi : method === "Cash" ? totals.cash : totals.card);

/** The share of a month that went on one method, 0 to 1 (0 when nothing was spent). */
export function methodShare(totals: MethodTotals, method: DailySpendMethod): number {
  if (totals.total <= 0) return 0;
  return methodAmount(totals, method) / totals.total;
}

export interface BigSpend {
  amount: number;
  date: string;
  note?: string;
  category?: string;
  method: DailySpendMethod;
}

export interface PeriodMonth extends MethodTotals {
  month: string;
  count: number;
  /** Counted diary days with nothing written. */
  quiet: number;
  /** The longest run of diary days at or under the month's daily allowance (its limit divided by its days); null without a limit. */
  run: number | null;
  /** The month's limit, if it had one. */
  limit: number | null;
  /** The month hasn't started, or it ended before the diary did. */
  empty: boolean;
  isFuture: boolean;
}

export interface PeriodView extends MethodTotals {
  kind: "year" | "month";
  /** "2026" or "2026-11". */
  key: string;
  months: PeriodMonth[];
  count: number;
  /** Months of the period that are over and were kept from their 1st. */
  completed: number;
  /** The average of those, or null when there are none. */
  average: number | null;
  /** Of the completed months that had a limit, how many stayed within it, and how many had one. */
  inside: number;
  withLimit: number;
  /** The completed months that went over their limit. */
  overMonths: { month: string; total: number; limit: number }[];
  categories: CategoryRow[];
  /** The three biggest single spends, biggest first. */
  biggest: BigSpend[];
  quiet: number;
  /** The longest run under the daily allowance across the period, with its month; null when no month had a limit. */
  longestRun: { run: number; month: string } | null;
  /** Diary days in the current month, counting back from today, at or under its daily allowance: the run he's on now. Null without a limit. */
  currentRun: number | null;
  /** The days of the period (a month only) at or under the daily allowance, and the days counted; null without a limit. */
  daysUnder: { under: number; of: number } | null;
}

const longestRunOf = (view: MonthView, allowance: number): number => {
  let best = 0;
  let run = 0;
  for (const d of view.days.filter((x) => x.kept)) {
    run = d.total <= allowance ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

/**
 * A period of months, for the widgets that follow the period picker: a year (January to December of `key`, "2026") or one month ("2026-11").
 * A range would be the same thing over its own list of months. `limitOf` is a month's limit (limitFor over the budgets), or null.
 */
export function periodView(spends: readonly DailySpend[], kind: "year" | "month", key: string, today: string, limitOf: (month: string) => number | null): PeriodView {
  const keys = kind === "month" ? [key] : Array.from({ length: 12 }, (_, i) => `${key}-${String(i + 1).padStart(2, "0")}`);
  const views = keys.map((m) => monthView(spends, m, today));
  const months = views.map((v): PeriodMonth => {
    const limit = limitOf(v.month);
    const allowance = limit === null ? null : limit / v.length;
    return { month: v.month, total: v.total, upi: v.upi, card: v.card, cash: v.cash, count: v.count, quiet: v.quietDays, run: allowance === null ? null : longestRunOf(v, allowance), limit, empty: v.isFuture || v.daysCounted === 0, isFuture: v.isFuture };
  });
  const all = spends.filter((s) => keys.includes(monthOf(s.date)));
  const totals = totalsOf(all);

  // A month the diary began partway through isn't a whole month, so it counts toward no average and no months-inside-the-limit.
  const completed = views.filter((v) => !v.isFuture && !v.isCurrent && v.days[0].kept);
  const average = completed.length ? Math.round(completed.reduce((a, v) => a + v.total, 0) / completed.length) : null;
  const limited = completed.filter((v) => limitOf(v.month) !== null);
  const overMonths = limited.filter((v) => v.total > (limitOf(v.month) as number)).map((v) => ({ month: v.month, total: v.total, limit: limitOf(v.month) as number }));

  const byCategory = new Map<string | null, number>();
  for (const s of all) byCategory.set(s.category ?? null, (byCategory.get(s.category ?? null) ?? 0) + paise(s.amount));
  const categories = [...byCategory]
    .map(([category, p]) => ({ category, amount: rupees(p), share: totals.total > 0 ? rupees(p) / totals.total : 0 }))
    .sort((a, b) => (a.category === null ? 1 : b.category === null ? -1 : b.amount - a.amount));

  const biggest = [...all]
    .sort((a, b) => b.amount - a.amount || (a.date < b.date ? -1 : 1))
    .slice(0, 3)
    .map((s): BigSpend => ({ amount: s.amount, date: s.date, method: s.method, ...(s.note && { note: s.note }), ...(s.category && { category: s.category }) }));

  const withRun = months.filter((m): m is PeriodMonth & { run: number } => m.run !== null);
  const longest = withRun.reduce<{ run: number; month: string } | null>((best, m) => (m.run > (best?.run ?? -1) ? { run: m.run, month: m.month } : best), null);

  const current = views.find((v) => v.isCurrent);
  const currentLimit = current ? limitOf(current.month) : null;
  let currentRun: number | null = null;
  if (current && currentLimit !== null) {
    const allowance = currentLimit / current.length;
    currentRun = 0;
    for (const d of [...current.days].reverse().filter((x) => x.kept)) {
      if (d.total > allowance) break;
      currentRun++;
    }
  }

  let daysUnder: PeriodView["daysUnder"] = null;
  if (kind === "month") {
    const limit = limitOf(key);
    if (limit !== null) {
      const v = views[0];
      const allowance = limit / v.length;
      daysUnder = { under: v.days.filter((d) => d.kept && d.total <= allowance).length, of: v.daysCounted };
    }
  }

  return {
    kind,
    key,
    months,
    ...totals,
    count: all.length,
    completed: completed.length,
    average,
    inside: limited.length - overMonths.length,
    withLimit: limited.length,
    overMonths,
    categories,
    biggest,
    quiet: months.reduce((a, m) => a + m.quiet, 0),
    longestRun: longest,
    currentRun,
    daysUnder,
  };
}
