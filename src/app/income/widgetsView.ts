import { daysBetween, heatLevel, type HeatCell, type HeatRow, type MonthAmount, type YearTotal } from "@/lib/aggregate/cardSpend";
import { monthlyEquivalentIncome, sourceColor } from "@/lib/aggregate/income";
import { daysAfterExpected, isLate, pendingPayments, upcomingPayments } from "@/lib/aggregate/incomeSchedule";
import { incomeByMonth, payChanges, receivedBetween, yearMonths } from "@/lib/aggregate/incomeYear";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { IncomeSource } from "@/lib/sheets/types";
import { ALL, type IncomeData } from "./views";

/**
 * The Income page's widgets under the cover (#189, IncomeZ1): the income heatmap, the income map beside the
 * Entries card. Plain, already-formatted data for every pick (all sources, or one), so picking is instant.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameOf = (s: IncomeSource | undefined) => s?.alias || s?.name || "A deleted source";
const colorOf = (s: IncomeSource | undefined): ColorKey => (s ? cardColorKey(sourceColor(s)) : "onyx");
const entriesOf = (data: IncomeData, pick: string) => (pick === ALL ? data.entries : data.entries.filter((e) => e.incomeSourceId === pick));

// ---------- The income heatmap ----------

export interface IncomeHeatmap {
  rows: HeatRow[];
  totals: YearTotal[];
  peak: MonthAmount | null;
}

/**
 * The year shown and the one before it, newest first, a row of twelve months each: what landed, shaded 1–5 against
 * the biggest month shown (Cards' heatmap grammar). This year's months still to come are dashed, holding what's
 * scheduled at the usual amounts; a past month with nothing is "no payment".
 */
export function incomeHeatmap(data: IncomeData, today: string, year: number, pick: string): IncomeHeatmap {
  const entries = entriesOf(data, pick);
  const sources = pick === ALL ? data.sources : data.sources.filter((s) => s.id === pick);
  const current = today.slice(0, 7);
  const upcoming = upcomingPayments(sources, data.entries, today, `${today.slice(0, 4)}-12-31`);
  const years = [year, year - 1];
  const amounts = new Map<string, number>();
  for (const y of years) for (const m of incomeByMonth(entries, y)) amounts.set(m.month, m.total);
  const shown = [...amounts.entries()].filter(([month]) => month <= current);
  const max = Math.max(0, ...shown.map(([, amount]) => amount));
  const peakEntry = shown.reduce<[string, number] | null>((b, e) => (e[1] > (b?.[1] ?? 0) ? e : b), null);

  const rows: HeatRow[] = years.map((y) => ({
    year: y,
    cells: yearMonths(y).map((month): HeatCell => {
      if (month > current) {
        const expected = upcoming.filter((u) => u.expectedDate.startsWith(month)).reduce((t, u) => t + u.amount, 0);
        return { month, amount: expected || null, state: "upcoming", level: 0 };
      }
      const amount = amounts.get(month) ?? 0;
      return amount > 0 ? { month, amount, state: "data", level: heatLevel(amount, max) } : { month, amount: null, state: "no-data", level: 0 };
    }),
  }));
  const totals: YearTotal[] = years.map((y) => {
    const months = y === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 12;
    const total = incomeByMonth(entries, y).reduce((t, m) => t + m.total, 0);
    return { year: y, total, months, average: months ? total / months : 0 };
  });
  return { rows, totals, peak: peakEntry && peakEntry[1] > 0 ? { month: peakEntry[0], amount: peakEntry[1] } : null };
}

// ---------- The income map ----------

export interface MapBlock {
  id: string;
  name: string;
  /** "Salary · Monthly". */
  kind: string;
  colorKey: ColorKey;
  value: number;
  /** Share of the map, 0–1. */
  share: number;
  /** "₹15,04,500 so far" / "₹1,38,500 a month". */
  amount: string;
  /** "Nov 1 · 8d", "14 days late", or "Done". */
  chip?: string;
  late: boolean;
}

export interface IncomeMap {
  received: MapBlock[];
  usual: MapBlock[];
  /** Sources with nothing to size: no payment this year, or no usual month (a one-time or inactive one). */
  leftOut: { received: { id: string; name: string; why: string }[]; usual: { id: string; name: string; why: string }[] };
}

/** Blocks sized by what each source paid in the year, or by its usual month (its amount over its cycle). */
export function incomeMap(data: IncomeData, today: string, year: number): IncomeMap {
  const pending = pendingPayments(data.sources, data.entries, today);
  const upcoming = upcomingPayments(data.sources, data.entries, today, `${Number(today.slice(0, 4)) + 1}-12-31`);
  const chip = (s: IncomeSource): { chip?: string; late: boolean } => {
    if (s.status !== "Active") return { chip: "Done", late: false };
    const late = pending.find((p) => p.sourceId === s.id);
    if (late) return { chip: `${plural(late.daysLate, "day")} late`, late: true };
    const next = upcoming.find((u) => u.sourceId === s.id);
    if (!next) return { late: false };
    return { chip: `${formatShortDate(next.expectedDate)} · ${daysBetween(today, next.expectedDate)}d`, late: false };
  };
  const blocks = (value: (s: IncomeSource) => number, amount: (v: number) => string): MapBlock[] => {
    const sized = data.sources.map((s) => ({ s, v: value(s) })).filter((x) => x.v > 0);
    const total = sized.reduce((t, x) => t + x.v, 0);
    return sized
      .sort((a, b) => b.v - a.v)
      .map(({ s, v }) => ({ id: s.id, name: nameOf(s), kind: `${s.category} · ${s.frequency}`, colorKey: colorOf(s), value: v, share: total ? v / total : 0, amount: amount(v), ...chip(s) }));
  };
  const landed = (s: IncomeSource) => receivedBetween(data.entries.filter((e) => e.incomeSourceId === s.id), `${year}-01-01`, `${year}-12-31`).reduce((t, e) => t + e.amount, 0);
  return {
    received: blocks(landed, (v) => `${formatInr(v)} ${year === Number(today.slice(0, 4)) ? "so far" : `in ${year}`}`),
    usual: blocks(monthlyEquivalentIncome, (v) => `${formatInr(v)} a month`),
    leftOut: {
      received: data.sources.filter((s) => landed(s) <= 0).map((s) => ({ id: s.id, name: nameOf(s), why: "nothing this year" })),
      usual: data.sources.filter((s) => monthlyEquivalentIncome(s) <= 0).map((s) => ({ id: s.id, name: nameOf(s), why: s.status !== "Active" ? "inactive" : "one-time" })),
    },
  };
}

// ---------- The Entries card ----------

export interface EntryRow {
  key: string;
  sourceId: string;
  name: string;
  /** "Quarterly". */
  frequency: string;
  colorKey: ColorKey;
  icon?: IncomeSource["icon"];
  /** "Oct 6", or "expected Oct 10" while pending. */
  when: string;
  /** "1 day after expected", "on the day", "14 days ago". */
  whenNote: string;
  amount: string;
  status: { text: string; tone: "good" | "warn" | "late" };
  fromStatement: boolean;
  /** Owed, not an entry: Mark received rather than Edit. */
  owed: boolean;
  /** The payday it's for (owed rows: the one Mark received opens on). */
  expectedDate: string;
}

export interface PayChangeRow {
  key: string;
  sourceId: string;
  name: string;
  colorKey: ColorKey;
  icon?: IncomeSource["icon"];
  /** "from Jul 10". */
  when: string;
  /** "+6.8%". */
  change: string;
  up: boolean;
  /** "₹5,900 → ₹6,300". */
  amounts: string;
}

export interface EntriesCard {
  rows: EntryRow[];
  changes: PayChangeRow[];
  /** "The 8 most recent of 41 entries since Jan 2025". */
  note: string;
}

const afterText = (days: number) => (days <= 0 ? "on the day" : `${plural(days, "day")} after expected`);

/** The latest entries for a pick, newest first with anything still owed on top, and its pay changes. */
export function entriesCard(data: IncomeData, today: string, pick: string, limit = 8): EntriesCard {
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  const sources = pick === ALL ? data.sources : data.sources.filter((s) => s.id === pick);
  // Newest owed first, on top of what's landed.
  const pending: EntryRow[] = pendingPayments(sources, data.entries, today)
    .sort((a, b) => b.expectedDate.localeCompare(a.expectedDate))
    .map((p) => {
    const s = byId.get(p.sourceId);
    return { key: `pending-${p.sourceId}-${p.expectedDate}`, sourceId: p.sourceId, name: nameOf(s), frequency: s?.frequency ?? "", colorKey: colorOf(s), icon: s?.icon, when: `expected ${formatShortDate(p.expectedDate)}`, whenNote: `${plural(p.daysLate, "day")} ago`, amount: formatInr(p.amount), status: { text: `${plural(p.daysLate, "day")} late`, tone: "late" }, fromStatement: false, owed: true, expectedDate: p.expectedDate };
  });
  const received = entriesOf(data, pick)
    .filter((e) => e.status === "Received" && e.receivedDate)
    .sort((a, b) => (b.receivedDate ?? "").localeCompare(a.receivedDate ?? "") || b.id.localeCompare(a.id));
  const rows: EntryRow[] = received.map((e) => {
    const s = byId.get(e.incomeSourceId);
    const after = daysAfterExpected(e) ?? 0;
    return {
      key: e.id,
      sourceId: e.incomeSourceId,
      name: nameOf(s) + (e.tag === "Bonus" ? " bonus" : ""),
      frequency: s?.frequency ?? "",
      colorKey: colorOf(s),
      icon: s?.icon,
      when: formatShortDate(e.receivedDate as string),
      whenNote: afterText(after),
      amount: formatInr(e.amount),
      status: isLate(e) ? { text: `Received · ${plural(after, "day")} late`, tone: "warn" } : { text: "Received", tone: "good" },
      fromStatement: e.origin === "Statement",
      owed: false,
      expectedDate: e.expectedDate,
    };
  });
  const all = [...pending, ...rows];
  const first = received.at(-1)?.receivedDate;
  const shown = Math.min(limit, all.length);
  const changes: PayChangeRow[] = payChanges(entriesOf(data, pick)).map((c) => {
    const s = byId.get(c.sourceId);
    return { key: c.entryId, sourceId: c.sourceId, name: nameOf(s) + (c.tag === "Bonus" ? " bonus" : ""), colorKey: colorOf(s), icon: s?.icon, when: `from ${formatShortDate(c.receivedDate)}`, change: `${c.ratio > 0 ? "+" : "−"}${(Math.abs(c.ratio) * 100).toFixed(1)}%`, up: c.ratio > 0, amounts: `${formatInr(c.from)} → ${formatInr(c.to)}` };
  });
  return {
    rows: all.slice(0, limit),
    changes,
    note: received.length === 0 ? (pending.length ? "Nothing received yet" : "No entries yet") : `${pending.length ? `${plural(pending.length, "payment")} owed, then the` : "The"} ${Math.min(shown - pending.length, received.length)} most recent of ${plural(received.length, "entry", "entries")}${first ? ` since ${formatMonthShort(first.slice(0, 7))} ${first.slice(0, 4)}` : ""}`,
  };
}

export interface IncomeWidgets {
  heatmap: Record<string, IncomeHeatmap>;
  map: IncomeMap;
  entries: Record<string, EntriesCard>;
}

/** Every widget's data for every pick, so the page switches picks without asking the server. */
export function incomeWidgets(data: IncomeData, today: string, year: number, picks: string[]): IncomeWidgets {
  return {
    heatmap: Object.fromEntries(picks.map((p) => [p, incomeHeatmap(data, today, year, p)])),
    map: incomeMap(data, today, year),
    entries: Object.fromEntries(picks.map((p) => [p, entriesCard(data, today, p)])),
  };
}
