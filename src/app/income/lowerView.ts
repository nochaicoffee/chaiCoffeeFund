import { daysBetween } from "@/lib/aggregate/cardSpend";
import { monthlyEquivalentIncome, sourceColor, totalMonthlyEquivalentIncome } from "@/lib/aggregate/income";
import { daysAfterExpected, nextPayment, pendingPayments, upcomingPayments } from "@/lib/aggregate/incomeSchedule";
import { againstLastYear, incomeByMonth, payChanges, projectedThroughYear, receivedBetween, sameDayLastYear, yearMonths } from "@/lib/aggregate/incomeYear";
import { addMonthsUTC } from "@/lib/aggregate/recurring";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { IncomeSource } from "@/lib/sheets/types";
import { ALL, type IncomeData } from "./views";

/**
 * The Income page's lower widgets (#189, IncomeZ1): the wide Trends card, the Sources table, and the Pay calendar
 * beside Pay changes. Plain, already-formatted data for every pick, from lib/aggregate's income math (PRD §8).
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameOf = (s: IncomeSource | undefined) => s?.alias || s?.name || "A deleted source";
const colorOf = (s: IncomeSource | undefined): ColorKey => (s ? cardColorKey(sourceColor(s)) : "onyx");
const entriesOf = (data: IncomeData, pick: string) => (pick === ALL ? data.entries : data.entries.filter((e) => e.incomeSourceId === pick));
const sourcesOf = (data: IncomeData, pick: string) => (pick === ALL ? data.sources : data.sources.filter((s) => s.id === pick));
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatInr(Math.abs(n))}`;
const cumulative = (values: number[]) => values.reduce<number[]>((out, v) => [...out, (out.at(-1) ?? 0) + v], []);

// ---------- Trends ----------

export interface TrendsCard {
  year: number;
  /** "Jan".."Dec". */
  months: string[];
  /** Index of this month in the year shown, or 11 for a past year. */
  nowIndex: number;
  /** Received adding up through the year, to this month (this year) or all twelve (a past year). */
  thisYear: number[];
  lastYear: number[];
  /** From this month on: received + pending + what's scheduled, adding up to December; null before this month. Empty for a past year. */
  projected: (number | null)[];
  /** Each month on its own, both years. */
  monthly: { thisYear: number[]; lastYear: number[] };
  /** "13% on this time last year" and whether it's up. */
  change?: { text: string; up: boolean };
  /** "₹16,18,800 now", "₹14,30,700 a year ago", "₹19L by Dec". */
  labels: { now: string; then: string; projected?: string; lastTotal: string };
  /** Biggest moves against the same days last year (a past year: the whole year before), by source. */
  movers: { name: string; colorKey: ColorKey; change: string; up: boolean }[];
  /** "on 2025, same days", or "on 2024" for a past year. */
  moversNote: string;
  /** Days after expected, a dot per payment received this year (bonuses have no fixed day and are left out). */
  rhythm: { key: string; month: number; day: number; days: number; name: string; colorKey: ColorKey; amount: string }[];
  rhythmNote: string;
}

export function trendsCard(data: IncomeData, today: string, year: number, pick: string): TrendsCard {
  const entries = entriesOf(data, pick);
  const sources = sourcesOf(data, pick);
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  const thisCalendarYear = Number(today.slice(0, 4));
  const current = year === thisCalendarYear;
  const nowIndex = current ? Number(today.slice(5, 7)) - 1 : 11;
  const mine = incomeByMonth(entries, year).map((m) => m.total);
  const before = incomeByMonth(entries, year - 1).map((m) => m.total);
  const thisYear = cumulative(mine).slice(0, nowIndex + 1);
  const lastYear = cumulative(before);

  const projected = current ? projectedThroughYear(sources, data.entries, today) : [];
  const projectedTotal = projected[11] ?? undefined;

  const vs = current ? againstLastYear(entries, today) : { thisYear: mine.reduce((a, b) => a + b, 0), lastYear: before.reduce((a, b) => a + b, 0) };
  const ratio = vs.lastYear ? (vs.thisYear - vs.lastYear) / vs.lastYear : undefined;
  const then = current ? sameDayLastYear(today) : `${year - 1}-12-31`;
  const moverIds = [...new Set(entries.map((e) => e.incomeSourceId))];
  const movers = moverIds
    .map((id) => {
      const now = receivedBetween(entries.filter((e) => e.incomeSourceId === id), `${year}-01-01`, current ? today : `${year}-12-31`).reduce((t, e) => t + e.amount, 0);
      const was = receivedBetween(entries.filter((e) => e.incomeSourceId === id), `${year - 1}-01-01`, then).reduce((t, e) => t + e.amount, 0);
      return { id, change: now - was };
    })
    .filter((m) => m.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)
    .map((m) => ({ name: nameOf(byId.get(m.id)), colorKey: colorOf(byId.get(m.id)), change: signed(m.change), up: m.change > 0 }));

  const landed = receivedBetween(entries, `${year}-01-01`, `${year}-12-31`).filter((e) => e.tag !== "Bonus");
  const rhythm = landed.map((e) => {
    const s = byId.get(e.incomeSourceId);
    return { key: e.id, month: Number((e.receivedDate as string).slice(5, 7)) - 1, day: Number((e.receivedDate as string).slice(8, 10)), days: daysAfterExpected(e) ?? 0, name: nameOf(s), colorKey: colorOf(s), amount: formatInr(e.amount) };
  });
  const average = rhythm.length ? rhythm.reduce((t, r) => t + Math.max(0, r.days), 0) / rhythm.length : 0;

  return {
    year,
    months: yearMonths(year).map(formatMonthShort),
    nowIndex,
    thisYear,
    lastYear,
    projected,
    monthly: { thisYear: mine.slice(0, nowIndex + 1), lastYear: before },
    change: ratio === undefined || Math.round(ratio * 100) === 0 ? undefined : { text: `${Math.round(Math.abs(ratio) * 100)}% ${ratio > 0 ? "up" : "down"} on ${current ? "this time last year" : year - 1}`, up: ratio > 0 },
    labels: { now: `${formatInr(vs.thisYear)} ${current ? "now" : `in ${year}`}`, then: `${formatInr(vs.lastYear)} ${current ? "a year ago" : `in ${year - 1}`}`, projected: projectedTotal !== undefined ? `${formatInr(projectedTotal)} by Dec` : undefined, lastTotal: `${formatInr(lastYear[11] ?? 0)} in ${year - 1}` },
    movers,
    moversNote: current ? `on ${year - 1}, same days` : `on ${year - 1}`,
    rhythm,
    rhythmNote: rhythm.length ? `${plural(rhythm.filter((r) => r.days > 3).length, "payment")} more than 3 days late · on average ${average < 0.05 ? "on the day" : `${average.toFixed(1)} days after expected`}` : "Nothing received this year yet",
  };
}

// ---------- Sources ----------

export interface SourceRow {
  id: string;
  name: string;
  /** "Salary · Monthly". */
  kind: string;
  colorKey: ColorKey;
  icon?: IncomeSource["icon"];
  usual: string;
  /** "₹1,38,500 a month", "one time". */
  usualNote: string;
  received: string;
  receivedNote: string;
  /** Twelve months: received, or expected (dashed) still to come. */
  months: { amount: number; expected: boolean }[];
  next: string;
  nextNote: string;
  nextLate: boolean;
  landsIn?: string;
  status: { text: string; tone: "good" | "warn" | "quiet" };
  inactive: boolean;
}

export interface SourcesTable {
  rows: SourceRow[];
  note: string;
}

export function sourcesTable(data: IncomeData, today: string, year: number): SourcesTable {
  const current = year === Number(today.slice(0, 4));
  const pending = pendingPayments(data.sources, data.entries, today);
  const upcoming = current ? upcomingPayments(data.sources, data.entries, today, `${year}-12-31`) : [];
  const ytdOf = new Map(data.sources.map((s) => [s.id, receivedBetween(data.entries.filter((e) => e.incomeSourceId === s.id), `${year}-01-01`, `${year}-12-31`)]));
  const ytd = (id: string) => ytdOf.get(id) ?? [];
  const totalOf = new Map([...ytdOf].map(([id, list]) => [id, list.reduce((t, e) => t + e.amount, 0)]));
  const rows = [...data.sources]
    .sort((a, b) => Number(a.status !== "Active") - Number(b.status !== "Active") || (totalOf.get(b.id) ?? 0) - (totalOf.get(a.id) ?? 0))
    .map((s): SourceRow => {
      const landed = ytd(s.id);
      const months = incomeByMonth(landed, year).map((m, i) => {
        const key = yearMonths(year)[i];
        const expected = upcoming.filter((u) => u.sourceId === s.id && u.expectedDate.startsWith(key)).reduce((t, u) => t + u.amount, 0);
        return m.total > 0 ? { amount: m.total, expected: false } : { amount: expected, expected: expected > 0 };
      });
      const late = pending.filter((p) => p.sourceId === s.id);
      const next = nextPayment(s, data.entries, today);
      const account = data.accounts.find((a) => a.id === s.accountId);
      const inactive = s.status !== "Active";
      return {
        id: s.id,
        name: s.name,
        kind: `${s.category} · ${s.frequency}`,
        colorKey: colorOf(s),
        icon: s.icon,
        usual: formatInr(s.expectedAmount),
        usualNote: s.frequency === "One-Time" ? "one time" : s.frequency === "Monthly" ? "a month" : `${formatInr(monthlyEquivalentIncome(s))} a month`,
        received: formatInr(landed.reduce((t, e) => t + e.amount, 0)),
        receivedNote: plural(landed.length, "payment"),
        months,
        next: inactive ? "Done" : next ? formatShortDate(next.expectedDate) : "—",
        nextNote: inactive ? (landed.length ? "received once" : "inactive") : next ? (next.pending ? `${plural(daysBetween(next.expectedDate, today), "day")} late` : `in ${plural(daysBetween(today, next.expectedDate), "day")}`) : "nothing scheduled",
        nextLate: !!next?.pending,
        landsIn: account?.name,
        status: inactive ? { text: "Inactive", tone: "quiet" } : late.length ? { text: "Pending", tone: "warn" } : { text: "On track", tone: "good" },
        inactive,
      };
    });
  const active = data.sources.filter((s) => s.status === "Active").length;
  return { rows, note: `${plural(active, "active source")} · a usual month is ${formatInr(totalMonthlyEquivalentIncome(data.sources))} when every one pays` };
}

// ---------- The pay calendar ----------

export interface CalendarPayment {
  key: string;
  name: string;
  colorKey: ColorKey;
  amount: string;
  /** "₹1.4L": what fits in a day's cell. */
  short: string;
  state: "received" | "pending" | "expected";
}

export interface CalendarMonth {
  key: string;
  /** "Oct 2026". */
  title: string;
  /** "₹1,56,900 received". */
  note: string;
  /** Monday-first weeks; null pads days outside the month. */
  weeks: ({ day: number; date: string; today: boolean; payments: CalendarPayment[] } | null)[][];
}

/** The pick's payments laid out by day, a month at a time, from the first month with income to December. */
export function payCalendar(data: IncomeData, today: string, year: number, pick: string): { months: CalendarMonth[]; start: number } {
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  const sources = sourcesOf(data, pick);
  const received = entriesOf(data, pick).filter((e) => e.status === "Received" && e.receivedDate);
  const pending = year === Number(today.slice(0, 4)) ? pendingPayments(sources, data.entries, today) : [];
  const upcoming = year === Number(today.slice(0, 4)) ? upcomingPayments(sources, data.entries, today, `${year}-12-31`) : [];
  const months = yearMonths(year).map((key): CalendarMonth => {
    const first = `${key}-01`;
    const days = daysBetween(first, addMonthsUTC(first, 1));
    const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
    const cells: CalendarMonth["weeks"][number] = [...Array.from({ length: lead }, () => null)];
    for (let d = 1; d <= days; d++) {
      const date = `${key}-${String(d).padStart(2, "0")}`;
      const payments: CalendarPayment[] = [
        ...received.filter((e) => e.receivedDate === date).map((e) => ({ key: e.id, name: nameOf(byId.get(e.incomeSourceId)), colorKey: colorOf(byId.get(e.incomeSourceId)), amount: formatInr(e.amount), short: formatInrCompact(e.amount), state: "received" as const })),
        ...pending.filter((p) => p.expectedDate === date).map((p) => ({ key: `p-${p.sourceId}-${date}`, name: nameOf(byId.get(p.sourceId)), colorKey: colorOf(byId.get(p.sourceId)), amount: formatInr(p.amount), short: formatInrCompact(p.amount), state: "pending" as const })),
        ...upcoming.filter((u) => u.expectedDate === date).map((u) => ({ key: `u-${u.sourceId}-${date}`, name: nameOf(byId.get(u.sourceId)), colorKey: colorOf(byId.get(u.sourceId)), amount: formatInr(u.amount), short: formatInrCompact(u.amount), state: "expected" as const })),
      ];
      cells.push({ day: d, date, today: date === today, payments });
    }
    while (cells.length % 7) cells.push(null);
    const total = received.filter((e) => (e.receivedDate as string).startsWith(key)).reduce((t, e) => t + e.amount, 0);
    return { key, title: formatMonthYear(key).replace(/^(\w{3})\w*/, "$1"), note: total ? `${formatInr(total)} received` : key > today.slice(0, 7) ? "still to come" : "nothing received", weeks: Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7)) };
  });
  const start = year === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) - 1 : 11;
  return { months, start };
}

// ---------- Pay changes ----------

export interface PayChangesCard {
  count: string;
  countNote: string;
  biggest?: { value: string; note: string };
  added: { value: string; note: string };
  bars: { key: string; name: string; colorKey: ColorKey; icon?: IncomeSource["icon"]; when: string; ratio: number; change: number; label: string; amountLabel: string; amounts: string }[];
}

export function payChangesCard(data: IncomeData, pick: string): PayChangesCard {
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  const all = payChanges(entriesOf(data, pick));
  // Every change counts; the bars show the newest six.
  const changes = all.slice(0, 6);
  const ups = all.filter((c) => c.change > 0);
  const biggest = [...ups].sort((a, b) => b.ratio - a.ratio)[0];
  const added = all.reduce((t, c) => t + c.change, 0);
  return {
    count: String(all.length),
    countNote: all.length === 0 ? "nothing moved 2% or more" : `${ups.length === all.length ? "all of them up" : `${ups.length} up, ${all.length - ups.length} down`}${all.length > changes.length ? ` · the newest ${changes.length} below` : ""}`,
    biggest: biggest && { value: `${(biggest.ratio * 100).toFixed(1)}%`, note: `${nameOf(byId.get(biggest.sourceId))}${biggest.tag === "Bonus" ? " bonus" : ""} · ${signed(biggest.change)}` },
    added: { value: signed(added), note: "across all of them" },
    bars: changes.map((c) => {
      const s = byId.get(c.sourceId);
      return { key: c.entryId, name: nameOf(s) + (c.tag === "Bonus" ? " bonus" : ""), colorKey: colorOf(s), icon: s?.icon, when: `from ${formatShortDate(c.receivedDate)}`, ratio: c.ratio, change: c.change, label: `${c.ratio > 0 ? "+" : "−"}${(Math.abs(c.ratio) * 100).toFixed(1)}%`, amountLabel: signed(c.change), amounts: `${formatInr(c.from)} → ${formatInr(c.to)}` };
    }),
  };
}

export interface LowerWidgets {
  trends: Record<string, TrendsCard>;
  sources: SourcesTable;
  calendar: Record<string, ReturnType<typeof payCalendar>>;
  changes: Record<string, PayChangesCard>;
}

export function lowerWidgets(data: IncomeData, today: string, year: number, picks: string[]): LowerWidgets {
  return {
    trends: Object.fromEntries(picks.map((p) => [p, trendsCard(data, today, year, p)])),
    sources: sourcesTable(data, today, year),
    calendar: Object.fromEntries(picks.map((p) => [p, payCalendar(data, today, year, p)])),
    changes: Object.fromEntries(picks.map((p) => [p, payChangesCard(data, p)])),
  };
}
