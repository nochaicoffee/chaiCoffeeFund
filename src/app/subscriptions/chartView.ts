import { daysBetween, monthOf } from "@/lib/aggregate/cardSpend";
import { dayGrid, paidByYear, paymentTrend, phoneDayWindow, runningTotal, type DayKind, type DayRenewal } from "@/lib/aggregate/subscriptionChart";
import { allFacts, usableSubscriptionData, type SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { renewalRows, type Place } from "@/lib/aggregate/subscriptionRenewalList";
import { lifetimeCost, type RenewalStatus } from "@/lib/aggregate/subscriptionRenewals";
import { monthlyEquivalent } from "@/lib/aggregate/subscriptions";
import { formatDate, formatDayDate, formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { cardName } from "@/lib/format/labels";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { ALL, subscriptionMark as mark, whenFrom, type ColorKey, type Mark } from "@/lib/format/subscriptionLabels";

/**
 * The chart at the end of the Subscriptions page (#127, docs/design/subscriptions.md
 * "The chart"), in the design's words: Day by day, Payment trend and Lifetime cost, for
 * every pick at once, with what its interactions show (#149): each day's and month's
 * card, each bar's parts, this year's running total and Lifetime cost by year. The
 * numbers come from lib/aggregate/subscriptionChart.ts and lifetimeCost(); this only
 * lays them out and words them.
 */

/** A subscription's part of something, in its colour, for a split bar or a stacked one. */
export interface PartView {
  id: string;
  color: ColorKey;
  amount: number;
}

/** A row of a light hover card: a subscription's mark, a label and an amount. */
export interface CardRowView {
  key: string;
  mark: Mark;
  label: string;
  amount: string;
  /** Its status, when the card's pill doesn't already say it: "not recorded", "to come". */
  note?: string;
}

/** A day's light card (5A). */
export interface DayCardView {
  /** "Fri, Oct 23 · in 3 days". */
  title: string;
  pill: "Paid" | "Expected" | "Not recorded" | "Pending" | "Didn't charge";
  total: string;
  /** Each renewal, biggest first: "Netflix · Millennia", with where it was charged (or, still to come, where it usually is). */
  rows: CardRowView[];
  footer: string | null;
}

export interface GridDayView {
  date: string;
  kind: DayKind;
  level: 2 | 3 | 4 | 5;
  /** The subscriptions renewing that day, so the pick's days can take its colour. */
  ids: string[];
  /** "Oct 23: Netflix ₹649, Spotify ₹139". */
  label: string;
  /** What a dragged range adds up (rangeTotals). */
  renewals: DayRenewal[];
  card: DayCardView;
  /** The renewal clicking the day records: the first one on it that passed with no payment. */
  record: { subscriptionId: string; renewalDate: string } | null;
}

/** A month's light card under the grid (5B). */
export interface MonthCardView {
  title: string;
  pill: "Paid" | "This month" | "Expected";
  total: string;
  /** Against a usual month (what everything active costs a month). */
  diff: { text: string; up: boolean } | null;
  /** Every subscription's part of the total, biggest first, for the split bar. */
  bar: PartView[];
  /** The biggest five. */
  rows: CardRowView[];
  /** "6 renewals · 1 not recorded". */
  footer: string;
}

export interface GridMonthView {
  month: string;
  name: string;
  total: string;
  future: boolean;
  current: boolean;
  week: number;
  weeks: number;
  /** "October 2026: ₹8,834, this month", for its button. */
  label: string;
  card: MonthCardView;
}

export interface GridView {
  start: string;
  first: string;
  last: string;
  weeks: number;
  months: GridMonthView[];
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
  /** The same parts in their colours, biggest first, for the bar's split when it's hovered (6A). */
  stack: PartView[];
  card: TrendCardView;
}

/** This year's running total for a pick (6B): by the end of each month, and the line its hover card adds. */
export interface RunningView {
  yearTotal: number;
  months: Record<string, { cumulative: number; label: string; note: string }>;
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
  /** What it cost each calendar year, oldest first, for the row's opened part (6C). */
  years: { year: string; paid: number; amount: string }[];
  /** "17 payments · about ₹1,999 each", or null with none. */
  each: string | null;
}

export type LifetimeSort = "paid" | "held" | "newest";

export interface ChartView {
  today: string;
  /** The year Day by day shows, and the window a phone shows. */
  year: string;
  desktopGrid: GridView;
  phoneGrid: GridView;
  trend: { months: TrendMonthView[]; peak: string | null };
  /** The dashed line on the trend: what a usual month costs, for All or for each pick. Zero for a stopped one: no line. */
  usual: Record<string, number>;
  /** This year's running total, for All and for each pick. */
  running: Record<string, RunningView>;
  lifetime: {
    rows: LifetimeRowView[];
    captions: Record<string, string>;
    /** The rows' ids in each order: most paid, longest held (earliest start) and newest. */
    order: Record<LifetimeSort, string[]>;
  };
}

/** What a day's pill says, by how the day is drawn. */
const DAY_PILL: Record<DayKind, DayCardView["pill"]> = { paid: "Paid", expected: "Expected", missing: "Not recorded", pending: "Pending", skipped: "Didn't charge" };
/** A renewal's status in a day card's row, and the pill that already says it. */
const STATUS_WORD: Record<Exclude<RenewalStatus, "wont-renew">, { note: string; pill: DayCardView["pill"] }> = {
  paid: { note: "paid", pill: "Paid" },
  upcoming: { note: "to come", pill: "Expected" },
  missing: { note: "not recorded", pill: "Not recorded" },
  pending: { note: "pending", pill: "Pending" },
  skipped: { note: "didn't charge", pill: "Didn't charge" },
};
const DAY_FOOTER: Record<DayKind, string | null> = {
  paid: null,
  expected: "Expected, at the plan's price",
  missing: "Not recorded yet",
  pending: "A payment recorded as pending isn't counted yet",
  skipped: "It didn't charge, so it adds nothing",
};

function placeName(place: Place, data: SubscriptionData): string {
  if (place.kind === "card") {
    const card = data.cards.find((c) => c.id === place.id);
    return card ? cardName(card) : "Unknown card";
  }
  return data.accounts.find((a) => a.id === place.id)?.name ?? "Unknown account";
}

/** How far a day is from today: whenFrom's words, in months once it's more than 45 days back. */
function fromToday(today: string, date: string): string {
  const days = daysBetween(today, date);
  return days < -45 ? `${Math.round(-days / 30)} months ago` : whenFrom(today, date);
}



function gridView(data: SubscriptionData, fromMonth: string, toMonth: string, today: string, compact: boolean, usual: number, places: Map<string, Place | null>): GridView {
  const grid = dayGrid(data.subscriptions, data.payments, fromMonth, toMonth, today);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const nowMonth = monthOf(today);
  return {
    start: grid.start,
    first: grid.first,
    last: grid.last,
    weeks: grid.weeks,
    months: grid.months.map((m) => {
      const bar = Object.entries(m.parts)
        .map(([id, amount]) => ({ id, color: mark(byId.get(id)!).color, amount }))
        .sort((a, b) => b.amount - a.amount);
      const pill = m.future ? "Expected" : m.month === nowMonth ? "This month" : "Paid";
      const diff = m.total - usual;
      const more = Math.max(0, bar.length - 5);
      return {
        month: m.month,
        name: formatMonthShort(m.month),
        total: compact ? formatInrCompact(m.total) : formatInr(m.total),
        future: m.future,
        current: m.month === nowMonth,
        week: m.week,
        weeks: m.weeks,
        label: `${formatMonthYear(m.month)}: ${formatInr(m.total)}, ${pill.toLowerCase()}`,
        card: {
          title: formatMonthYear(m.month),
          pill,
          total: formatInr(m.total),
          diff: usual > 0 && Math.round(diff) !== 0 ? { text: `${diff > 0 ? "▲" : "▼"} ${formatInr(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than a usual month of ${formatInr(usual)}`, up: diff > 0 } : null,
          bar,
          rows: bar.slice(0, 5).map((p) => ({ key: p.id, mark: mark(byId.get(p.id)!), label: byId.get(p.id)!.alias, amount: formatInr(p.amount) })),
          footer: [plural(m.renewals, "renewal"), ...(more ? [`${more} more not listed`] : []), ...(m.notRecorded ? [`${m.notRecorded} not recorded`] : [])].join(" · "),
        },
      };
    }),
    days: grid.days.map((d) => {
      const pill = DAY_PILL[d.kind];
      const missing = d.renewals.find((r) => r.status === "missing");
      return {
        date: d.date,
        kind: d.kind,
        level: d.level,
        ids: [...new Set(d.renewals.map((r) => r.subscriptionId))],
        label: `${formatShortDate(d.date)}: ${d.renewals.map((r) => `${byId.get(r.subscriptionId)?.alias ?? "Unknown"} ${r.status === "skipped" ? "didn't charge" : formatInr(r.amount)}${r.status === "missing" ? " (not recorded)" : r.status === "pending" ? " (pending)" : r.status === "upcoming" ? " (to come)" : ""}`).join(", ")}`,
        renewals: d.renewals.map((r) => ({ subscriptionId: r.subscriptionId, status: r.status, amount: r.amount })),
        card: {
          title: `${formatDayDate(d.date)} · ${fromToday(today, d.date)}`,
          pill,
          total: formatInr(d.total),
          rows: [...d.renewals]
            .sort((a, b) => b.amount - a.amount)
            .map((r, i) => {
              const s = byId.get(r.subscriptionId)!;
              const place = places.get(`${r.subscriptionId} ${r.date}`);
              const word = r.status === "wont-renew" ? undefined : STATUS_WORD[r.status];
              return {
                key: `${r.subscriptionId}-${i}`,
                mark: mark(s),
                label: place ? `${s.alias} · ${placeName(place, data)}` : s.alias,
                amount: r.status === "skipped" ? "₹0" : formatInr(r.amount),
                note: word && word.pill !== pill ? word.note : undefined,
              };
            }),
          footer: DAY_FOOTER[d.kind],
        },
        record: missing ? { subscriptionId: missing.subscriptionId, renewalDate: missing.date } : null,
      };
    }),
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

  const color = (id: string) => mark(byId.get(id)!).color;
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
      stack: Object.entries(m.parts)
        .map(([id, amount]) => ({ id, color: color(id), amount }))
        .sort((a, b) => b.amount - a.amount),
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

  const running: Record<string, RunningView> = { [ALL]: runningView(runningTotal(data.subscriptions, data.payments, today), nowMonth) };
  for (const s of data.subscriptions) running[s.id] = runningView(runningTotal(data.subscriptions, data.payments, today, s.id), nowMonth);

  // Where each of the year's renewals was charged, as the Renewals page has it.
  const places = new Map(renewalRows(data, { kind: "year", year: Number(year) }, today).map((r) => [`${r.subscriptionId} ${r.date}`, r.place]));

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
      years: paidByYear(data.payments, s.id).map((y) => ({ ...y, amount: formatInrCompact(y.paid) })),
      each: c.payments ? `${plural(c.payments, "payment")} · about ${formatInr(c.paid / c.payments)} each` : null,
    };
  });
  const start = (id: string) => byId.get(id)!.startDate;
  // Ties keep the most-paid order.
  const order: Record<LifetimeSort, string[]> = {
    paid: rows.map((r) => r.id),
    held: rows.map((r) => r.id).sort((a, b) => (start(a) === start(b) ? 0 : start(a) < start(b) ? -1 : 1)),
    newest: rows.map((r) => r.id).sort((a, b) => (start(a) === start(b) ? 0 : start(a) > start(b) ? -1 : 1)),
  };
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
    desktopGrid: gridView(data, `${year}-01`, `${year}-12`, today, false, usualAll, places),
    phoneGrid: gridView(data, phone.from, phone.to, today, true, usualAll, places),
    trend: { months, peak: trend.peak },
    usual,
    running,
    lifetime: { rows, captions, order },
  };
}

/**
 * A running total in the trend card's words: "₹48,212 by the end of Aug", and whether
 * that's paid, paid and still due (this month, while something is), or expected, with
 * where the year is heading. Nothing to draw (no months) when nothing's been paid or is due this year.
 */
function runningView(total: ReturnType<typeof runningTotal>, nowMonth: string): RunningView {
  const months: RunningView["months"] = {};
  if (total.yearTotal <= 0) return { yearTotal: 0, months };
  const heading = `on course for ${formatInr(total.yearTotal)} in ${total.year}`;
  for (const m of total.months) {
    const state = m.month < nowMonth || (m.month === nowMonth && m.expected === 0) ? "paid" : m.month === nowMonth ? "paid and still due" : "expected";
    months[m.month] = {
      cumulative: m.cumulative,
      label: `${formatInr(m.cumulative)} by the end of ${formatMonthShort(m.month)}`,
      note: m.month.endsWith("-12") ? `${state} · what ${total.year} is on course for` : `${state} · ${heading}`,
    };
  }
  return { yearTotal: total.yearTotal, months };
}

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
