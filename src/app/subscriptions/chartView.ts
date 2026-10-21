import { monthOf } from "@/lib/aggregate/cardSpend";
import { dayGrid, paymentTrend, phoneDayWindow, type DayKind } from "@/lib/aggregate/subscriptionChart";
import { allFacts, usableSubscriptionData, type SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { lifetimeCost } from "@/lib/aggregate/subscriptionRenewals";
import { monthlyEquivalent } from "@/lib/aggregate/subscriptions";
import { formatDate, formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { ALL, subscriptionMark as mark, type Mark } from "@/lib/format/subscriptionLabels";

/**
 * The chart at the end of the Subscriptions page (#127, docs/design/subscriptions.md
 * "The chart"), in the design's words: Day by day, Payment trend and Lifetime cost, for
 * every pick at once. The numbers come from lib/aggregate/subscriptionChart.ts and
 * lifetimeCost(); this only lays them out and words them.
 */

export interface GridDayView {
  date: string;
  kind: DayKind;
  level: 2 | 3 | 4 | 5;
  /** The subscriptions renewing that day, so the pick's days can take its colour. */
  ids: string[];
  /** "Oct 23: Netflix ₹649, Spotify ₹139". */
  label: string;
}

export interface GridView {
  start: string;
  first: string;
  last: string;
  weeks: number;
  months: { month: string; name: string; total: string; future: boolean; current: boolean; week: number; weeks: number }[];
  days: GridDayView[];
}

export interface TrendCardView {
  title: string;
  pill: "Paid" | "This month" | "Expected";
  total: string;
  /** Against a usual month (what everything active costs a month). */
  diff: { text: string; up: boolean } | null;
  /**
   * Its renewals, the ones in its total first, biggest first. One not recorded or pending
   * isn't in the total (only payments and renewals still to come are), so it's noted and muted.
   */
  rows: { key: string; mark: Mark; label: string; amount: string; note?: string; muted: boolean }[];
  more: number;
}

export interface TrendMonthView {
  month: string;
  /** "Oct", or "Jan '27" when a year starts. */
  name: string;
  total: number;
  future: boolean;
  current: boolean;
  parts: Record<string, number>;
  card: TrendCardView;
}

export interface LifetimeRowView {
  id: string;
  mark: Mark;
  paid: number;
  /** Against the biggest, for its bar. */
  fraction: number;
  detail: string;
  /** What each payment cost, oldest first, for its little line. */
  amounts: number[];
}

export interface ChartView {
  today: string;
  /** The year Day by day shows, and the window a phone shows. */
  year: string;
  desktopGrid: GridView;
  phoneGrid: GridView;
  trend: { months: TrendMonthView[]; peak: string | null };
  /** The dashed line on the trend: what a usual month costs, for All or for each pick. Zero for a stopped one: no line. */
  usual: Record<string, number>;
  lifetime: { rows: LifetimeRowView[]; captions: Record<string, string> };
}


function gridView(data: SubscriptionData, fromMonth: string, toMonth: string, today: string, compact: boolean): GridView {
  const grid = dayGrid(data.subscriptions, data.payments, fromMonth, toMonth, today);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const nowMonth = monthOf(today);
  return {
    start: grid.start,
    first: grid.first,
    last: grid.last,
    weeks: grid.weeks,
    months: grid.months.map((m) => ({
      month: m.month,
      name: formatMonthShort(m.month),
      total: compact ? formatInrCompact(m.total) : formatInr(m.total),
      future: m.future,
      current: m.month === nowMonth,
      week: m.week,
      weeks: m.weeks,
    })),
    days: grid.days.map((d) => ({
      date: d.date,
      kind: d.kind,
      level: d.level,
      ids: [...new Set(d.renewals.map((r) => r.subscriptionId))],
      label: `${formatShortDate(d.date)}: ${d.renewals.map((r) => `${byId.get(r.subscriptionId)?.alias ?? "Unknown"} ${r.status === "skipped" ? "didn't charge" : formatInr(r.amount)}${r.status === "missing" ? " (not recorded)" : r.status === "pending" ? " (pending)" : r.status === "upcoming" ? " (to come)" : ""}`).join(", ")}`,
    })),
  };
}

export function chartView(sheetData: SubscriptionData, today: string): ChartView {
  const data = usableSubscriptionData(sheetData);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const year = today.slice(0, 4);
  const phone = phoneDayWindow(today);
  const usualAll = allFacts(data.subscriptions, data.payments, today).monthly;
  const nowMonth = monthOf(today);
  const trend = paymentTrend(data.subscriptions, data.payments, today);

  const months: TrendMonthView[] = trend.months.map((m) => {
    const counted = (status: string) => status === "paid" || status === "upcoming";
    const ordered = [...m.renewals].sort((a, b) => Number(counted(b.status)) - Number(counted(a.status)) || b.amount - a.amount);
    const NOTE: Record<string, string> = { missing: "not recorded", pending: "pending", skipped: "didn't charge" };
    const rows = ordered.slice(0, 4).map((r, i) => {
      const s = byId.get(r.subscriptionId)!;
      return {
        key: `${r.subscriptionId}-${r.date}-${i}`,
        mark: mark(s),
        label: `${s.alias} · ${formatShortDate(r.date)}`,
        amount: r.status === "skipped" ? "₹0" : formatInr(r.amount),
        note: NOTE[r.status],
        muted: !counted(r.status),
      };
    });
    const diff = m.total - usualAll;
    return {
      month: m.month,
      name: m.month.endsWith("-01") ? `${formatMonthShort(m.month)} ’${m.month.slice(2, 4)}` : formatMonthShort(m.month),
      total: m.total,
      future: m.future,
      current: m.month === nowMonth,
      parts: m.parts,
      card: {
        title: formatMonthYear(m.month),
        pill: m.future ? "Expected" : m.month === nowMonth ? "This month" : "Paid",
        total: formatInr(m.total),
        diff: usualAll > 0 && Math.round(diff) !== 0 ? { text: `${formatInr(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than a usual month`, up: diff > 0 } : null,
        rows,
        more: Math.max(0, m.renewals.length - rows.length),
      },
    };
  });

  const usual: Record<string, number> = { [ALL]: usualAll };
  for (const s of data.subscriptions) usual[s.id] = s.status === "Active" ? monthlyEquivalent(s) : 0;

  const costs = lifetimeCost(data.subscriptions, data.payments);
  const biggest = costs[0]?.paid ?? 0;
  const total = costs.reduce((t, c) => t + c.paid, 0);
  const firstPaid = data.payments.filter((p) => p.status === "Paid" && p.amount > 0).map((p) => p.paymentDate).sort()[0];
  const rows: LifetimeRowView[] = costs.map((c) => {
    const s = byId.get(c.subscriptionId)!;
    const since = `since ${formatMonthShort(s.startDate.slice(0, 7))} ${s.startDate.slice(0, 4)}`;
    return {
      id: s.id,
      mark: mark(s),
      paid: c.paid,
      fraction: biggest > 0 ? c.paid / biggest : 0,
      detail: `${c.payments} ${c.payments === 1 ? "payment" : "payments"} · ${since}${s.status === "Active" ? "" : ` · ${s.status.toLowerCase()}`}`,
      amounts: c.amounts,
    };
  });
  const captions: Record<string, string> = {
    [ALL]:
      total > 0 && costs[0]
        ? `You've paid ${formatInr(total)} across ${plural(data.subscriptions.length, "subscription")} since ${formatMonthShort(firstPaid.slice(0, 7))} ${firstPaid.slice(0, 4)}. ${byId.get(costs[0].subscriptionId)!.alias} is the biggest at ${formatInr(biggest)}.`
        : "Nothing paid yet. Each subscription's total shows here once its payments are recorded.",
  };
  for (const c of costs) {
    const s = byId.get(c.subscriptionId)!;
    captions[s.id] = c.payments
      ? `${s.alias}: ${formatInr(c.paid)} over ${plural(c.payments, "payment")} since ${formatDate(s.startDate)}, ${Math.round((c.paid / total) * 100)}% of everything you've paid for subscriptions.`
      : `${s.alias}: nothing paid yet.`;
  }

  return {
    today,
    year,
    desktopGrid: gridView(data, `${year}-01`, `${year}-12`, today, false),
    phoneGrid: gridView(data, phone.from, phone.to, today, true),
    trend: { months, peak: trend.peak },
    usual,
    lifetime: { rows, captions },
  };
}

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
