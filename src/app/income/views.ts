import type { SentencePart } from "@/app/cards/summarySentence";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { monthlyEquivalentIncome, sourceColor, totalMonthlyEquivalentIncome } from "@/lib/aggregate/income";
import { nextPayment, onTimeSummary, pendingPayments, sumAmounts, upcomingPayments, type PendingPayment } from "@/lib/aggregate/incomeSchedule";
import { againstLastYear, incomeByMonth, receivedBetween, receivedMonthlyAverage, sameDayLastYear, totalReceivedBetween } from "@/lib/aggregate/incomeYear";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatMonthShort, formatMonthYear, formatShortDate, MONTH_NAMES } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { Account, IncomeEntry, IncomeSource, IncomeTag } from "@/lib/sheets/types";

/**
 * What the Income page shows (#188, docs/design/income.md "The final design"), as plain, already-formatted
 * data: the greeting's sentence and the cards its figures point at, the attention strip, and the Year in columns
 * cover for every pick (all sources, or one). The numbers come from lib/aggregate (PRD §8): money counts on the
 * day it landed; pending and upcoming are worked out from each source's schedule.
 */

export const ALL = "all";
/** What's "coming up" in the greeting: the next 30 days, today included. */
export const NEXT_DAYS = 30;

export interface IncomeData {
  sources: IncomeSource[];
  entries: IncomeEntry[];
  /** For where income lands: names only. */
  accounts: Pick<Account, "id" | "name">[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const sourceName = (s: IncomeSource | undefined) => s?.alias || s?.name || "A deleted source";
const colorOf = (s: IncomeSource | undefined): ColorKey => (s ? cardColorKey(sourceColor(s)) : "onyx");
const percent = (ratio: number) => `${Math.round(Math.abs(ratio) * 100)}%`;
const inDays = (from: string, to: string) => {
  const n = daysBetween(from, to);
  return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
};

/** Received entries of one source, or all. */
const entriesOf = (data: IncomeData, pick: string) => (pick === ALL ? data.entries : data.entries.filter((e) => e.incomeSourceId === pick));

// ---------- The cover: Year in columns ----------

export interface CoverSegment {
  key: string;
  label: string;
  colorKey: ColorKey;
  amount: number;
}

export interface CoverMonth {
  key: string;
  /** "Jan". */
  label: string;
  total: number;
  /** What landed, bottom up: by source (biggest overall first) or by tag (Regular, Bonus, Other). */
  bySource: CoverSegment[];
  byTag: CoverSegment[];
  /** What landed by source and tag, so a picked source's own tag split can be drawn. */
  parts: { sourceId: string; tag: IncomeTag; amount: number }[];
  /** Still owed from this month (pending), and, from today on, what's scheduled at the usual amounts. */
  pending: number;
  expected: number;
  /** The same two for each source, for when one is picked. */
  pendingOf: Record<string, number>;
  expectedOf: Record<string, number>;
  current: boolean;
  future: boolean;
}

export interface CoverFigure {
  label: string;
  value: string;
  note: string;
  tone?: "warn" | "good";
}

export interface CoverPick {
  id: string;
  label: string;
  colorKey: ColorKey;
  /** "Every source" or the source's name and how often. */
  eyebrow: string;
  total: number;
  /** "13% more than this time last year", when there's a last year to compare with. */
  change?: { text: string; up: boolean };
  figures: CoverFigure[];
  /** A line across the columns: a usual month for all sources or a monthly one, else the usual payment. */
  line: { label: string; amount: number };
}

export interface CoverView {
  year: number;
  months: CoverMonth[];
  /** The sources in the columns and the chips, biggest this year first; inactive ones last. */
  sources: { id: string; label: string; colorKey: ColorKey; inactive: boolean }[];
  picks: CoverPick[];
}

export const TAG_SEGMENTS: { tag: IncomeTag; label: string; colorKey: ColorKey }[] = [
  { tag: "Regular", label: "Regular", colorKey: "emerald" },
  { tag: "Bonus", label: "Bonus", colorKey: "violet" },
  { tag: "Other", label: "One-off", colorKey: "slate" },
];

function onTime(entries: IncomeEntry[]): CoverFigure {
  const s = onTimeSummary(entries);
  if (s.count === 0) return { label: "On time", value: "—", note: "nothing received yet" };
  return { label: "On time", value: `${s.onTime} of ${s.count}`, note: `on average ${s.averageDaysAfter < 0.05 ? "on the day" : `${s.averageDaysAfter.toFixed(1)} days after expected`}`, tone: s.onTime === s.count ? "good" : undefined };
}

function pendingFigure(pending: PendingPayment[], data: IncomeData, yearStart: string): CoverFigure {
  if (pending.length === 0) return { label: "Pending", value: formatInr(0), note: "nothing late", tone: "good" };
  const sources = new Set(pending.map((p) => p.sourceId));
  const first = pending[0];
  const who = sources.size === 1 ? sourceName(data.sources.find((s) => s.id === first.sourceId)) : plural(sources.size, "source");
  // Owed from before this year has no column to sit on top of, so the figure says so.
  const earlier = sumAmounts(pending.filter((p) => p.expectedDate < yearStart));
  return { label: "Pending", value: formatInr(sumAmounts(pending)), note: `${who} · ${plural(first.daysLate, "day")} late${earlier ? ` · ${formatInr(earlier)} from last year` : ""}`, tone: "warn" };
}

/** A past year's figures: what it was like then, never today's pending or next payment. */
function pastYearFigures(entries: IncomeEntry[], year: number): CoverFigure[] {
  const landed = receivedBetween(entries, `${year}-01-01`, `${year}-12-31`);
  const months = incomeByMonth(landed, year);
  const best = months.reduce((b, m) => (m.total > b.total ? m : b), months[0]);
  const total = sumAmounts(landed);
  return [
    { label: "About a month", value: formatInr(total / 12), note: `${formatInr(total)} over 12 months` },
    best.total > 0 ? { label: "Biggest month", value: formatMonthShort(best.month), note: formatInr(best.total) } : { label: "Biggest month", value: "—", note: "nothing received" },
    { label: "Payments", value: String(landed.length), note: `${plural(new Set(landed.map((e) => e.incomeSourceId)).size, "source")}` },
    onTime(landed),
  ];
}

function bySourceId(payments: { sourceId: string; amount: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of payments) out[p.sourceId] = (out[p.sourceId] ?? 0) + p.amount;
  return out;
}

function monthParts(entries: IncomeEntry[], month: string): CoverMonth["parts"] {
  const totals = new Map<string, { sourceId: string; tag: IncomeTag; amount: number }>();
  for (const e of entries) {
    if (e.status !== "Received" || !e.receivedDate?.startsWith(month)) continue;
    const key = `${e.incomeSourceId}|${e.tag}`;
    const part = totals.get(key) ?? { sourceId: e.incomeSourceId, tag: e.tag, amount: 0 };
    part.amount += e.amount;
    totals.set(key, part);
  }
  return [...totals.values()];
}

export function coverView(data: IncomeData, today: string, year: number): CoverView {
  const thisYear = Number(today.slice(0, 4));
  const yearEnd = `${year}-12-31`;
  const pendingAll = year === thisYear ? pendingPayments(data.sources, data.entries, today) : [];
  const upcomingAll = year === thisYear ? upcomingPayments(data.sources, data.entries, today, yearEnd) : [];
  const ytd = (id: string) => totalReceivedBetween(entriesOf(data, id), `${year}-01-01`, yearEnd);
  const ordered = [...data.sources].sort((a, b) => Number(a.status !== "Active") - Number(b.status !== "Active") || ytd(b.id) - ytd(a.id) || a.name.localeCompare(b.name));
  const byId = new Map(data.sources.map((s) => [s.id, s]));

  const months: CoverMonth[] = incomeByMonth(data.entries, year).map((m) => {
    const ids = [...ordered.map((s) => s.id), ...Object.keys(m.bySource).filter((id) => !byId.has(id))];
    return {
      key: m.month,
      label: formatMonthShort(m.month),
      total: m.total,
      bySource: ids.filter((id) => m.bySource[id]).map((id) => ({ key: id, label: sourceName(byId.get(id)), colorKey: colorOf(byId.get(id)), amount: m.bySource[id] })),
      byTag: TAG_SEGMENTS.filter((t) => m.byTag[t.tag]).map((t) => ({ key: t.tag, label: t.label, colorKey: t.colorKey, amount: m.byTag[t.tag] })),
      parts: monthParts(data.entries, m.month),
      pending: sumAmounts(pendingAll.filter((p) => p.expectedDate.startsWith(m.month))),
      expected: sumAmounts(upcomingAll.filter((p) => p.expectedDate.startsWith(m.month))),
      pendingOf: bySourceId(pendingAll.filter((p) => p.expectedDate.startsWith(m.month))),
      expectedOf: bySourceId(upcomingAll.filter((p) => p.expectedDate.startsWith(m.month))),
      current: m.month === today.slice(0, 7),
      future: m.month > today.slice(0, 7),
    };
  });

  const pickFor = (id: string): CoverPick => {
    const source = byId.get(id);
    const entries = entriesOf(data, id);
    const total = totalReceivedBetween(entries, `${year}-01-01`, yearEnd);
    // Against the same days last year this year; a past year against the whole year before.
    const then = year === thisYear ? againstLastYear(entries, today) : { thisYear: total, lastYear: totalReceivedBetween(entries, `${year - 1}-01-01`, `${year - 1}-12-31`), ratio: undefined as number | undefined };
    const ratio = then.lastYear ? (then.thisYear - then.lastYear) / then.lastYear : undefined;
    const change = ratio === undefined || Math.round(ratio * 100) === 0 ? undefined : { text: `${percent(ratio)} ${ratio > 0 ? "more" : "less"} than ${year === thisYear ? "this time last year" : year - 1}`, up: ratio > 0 };
    const landedThisYear = receivedBetween(entries, `${year}-01-01`, yearEnd);
    if (!source) {
      const next = upcomingPayments(data.sources, data.entries, today, addDays(today, 366))[0];
      const nextSource = next && byId.get(next.sourceId);
      return {
        id: ALL,
        label: "All sources",
        colorKey: "emerald",
        eyebrow: "Every source",
        total,
        change,
        line: { label: "A usual month", amount: totalMonthlyEquivalentIncome(data.sources) },
        figures: year !== thisYear ? pastYearFigures(entries, year) : [
          { label: "A usual month", value: formatInr(totalMonthlyEquivalentIncome(data.sources)), note: "when every source pays" },
          pendingFigure(pendingAll, data, `${year}-01-01`),
          next ? { label: "Next payday", value: formatShortDate(next.expectedDate), note: `${sourceName(nextSource)} ${formatInr(next.amount)} · ${inDays(today, next.expectedDate)}` } : { label: "Next payday", value: "—", note: "nothing scheduled" },
          onTime(landedThisYear),
        ],
      };
    }
    const next = nextPayment(source, data.entries, today);
    const last = entries.filter((e) => e.status === "Received" && e.receivedDate).sort((a, b) => (b.receivedDate ?? "").localeCompare(a.receivedDate ?? ""))[0];
    const account = data.accounts.find((a) => a.id === source.accountId);
    return {
      id: source.id,
      label: sourceName(source),
      colorKey: colorOf(source),
      eyebrow: `${source.name} · ${source.frequency === "One-Time" ? "once" : source.frequency.toLowerCase()}${source.status === "Active" ? "" : " · inactive"}`,
      total,
      change,
      line: source.frequency === "Monthly" ? { label: "A usual month", amount: source.expectedAmount } : { label: "A usual payment", amount: source.expectedAmount },
      figures: year !== thisYear ? pastYearFigures(entries, year) : [
        { label: "Usual amount", value: formatInr(source.expectedAmount), note: source.frequency === "One-Time" ? "once" : `${formatInr(monthlyEquivalentIncome(source))} a month` },
        next
          ? next.pending
            ? { label: "Next", value: formatShortDate(next.expectedDate), note: `${plural(daysBetween(next.expectedDate, today), "day")} late`, tone: "warn" }
            : { label: "Next", value: formatShortDate(next.expectedDate), note: inDays(today, next.expectedDate) }
          : { label: "Next", value: "—", note: source.status === "Active" ? "nothing scheduled" : "inactive" },
        last ? { label: "Last paid", value: formatShortDate(last.receivedDate as string), note: formatInr(last.amount) } : { label: "Last paid", value: "—", note: "nothing received yet" },
        account ? { label: "Lands in", value: account.name, note: "usually" } : onTime(landedThisYear),
      ],
    };
  };

  return {
    year,
    months,
    sources: ordered.map((s) => ({ id: s.id, label: sourceName(s), colorKey: colorOf(s), inactive: s.status !== "Active" })),
    picks: [pickFor(ALL), ...ordered.map((s) => pickFor(s.id))],
  };
}

// ---------- The attention strip ----------

export interface AttentionItem {
  sourceId: string;
  name: string;
  text: string;
  amount: string;
}

/** A line per source with money past its expected date: what, since when, and where it should have landed. */
export function attentionView(data: IncomeData, today: string): AttentionItem[] {
  const pending = pendingPayments(data.sources, data.entries, today);
  return data.sources.flatMap((s) => {
    const mine = pending.filter((p) => p.sourceId === s.id);
    if (mine.length === 0) return [];
    const account = data.accounts.find((a) => a.id === s.accountId);
    const first = mine[0];
    const when = mine.length === 1 ? `was expected ${formatShortDate(first.expectedDate)} (${plural(first.daysLate, "day")} ago)` : `${plural(mine.length, "payment")} haven't landed, the first expected ${formatShortDate(first.expectedDate)}`;
    return [{ sourceId: s.id, name: sourceName(s), amount: formatInr(sumAmounts(mine)), text: mine.length === 1 ? `${when} and hasn't landed${account ? ` in ${account.name}` : ""}.` : `${when}.` }];
  });
}

// ---------- The greeting ----------

export interface GreetingRow {
  key: string;
  name: string;
  colorKey: ColorKey;
  amount: string;
  note?: string;
  /** 0–1: a bar beside the amount. */
  fraction?: number;
  warn?: boolean;
}

export interface GreetingMonths {
  key: string;
  label: string;
  total: number;
  lit: boolean;
}

export interface IncomeGreetingCards {
  received?: { title: string; total: string; rows: GreetingRow[] };
  average?: { title: string; total: string; rows: GreetingRow[]; note: string };
  vsLast?: { title: string; total: string; rows: GreetingRow[]; note: string };
  best?: { title: string; total: string; rows: GreetingRow[]; months: GreetingMonths[] };
  late?: { title: string; total: string; rows: GreetingRow[] };
  next?: { title: string; total: string; rows: GreetingRow[] };
}

interface GreetingFacts {
  year: number;
  thisYear: boolean;
  from: string;
  to: string;
  received: number;
  average: number;
  vs: { thisYear: number; lastYear: number; ratio?: number; then: string };
  best?: { month: string; total: number };
  pending: PendingPayment[];
  next: ReturnType<typeof upcomingPayments>;
  months: ReturnType<typeof incomeByMonth>;
}

function facts(data: IncomeData, today: string, year: number): GreetingFacts {
  const thisYear = year === Number(today.slice(0, 4));
  const from = `${year}-01-01`;
  const to = thisYear ? today : `${year}-12-31`;
  const received = totalReceivedBetween(data.entries, from, to);
  const months = incomeByMonth(data.entries, year);
  const best = months.reduce<{ month: string; total: number } | undefined>((b, m) => (m.total > (b?.total ?? 0) ? { month: m.month, total: m.total } : b), undefined);
  const vs = thisYear
    ? { ...againstLastYear(data.entries, today), then: sameDayLastYear(today) }
    : { thisYear: received, lastYear: totalReceivedBetween(data.entries, `${year - 1}-01-01`, `${year - 1}-12-31`), then: `${year - 1}-12-31` };
  return {
    year,
    thisYear,
    from,
    to,
    received,
    average: thisYear ? receivedMonthlyAverage(data.entries, today) : received / 12,
    vs: { ...vs, ratio: vs.lastYear ? (vs.thisYear - vs.lastYear) / vs.lastYear : undefined },
    best,
    pending: thisYear ? pendingPayments(data.sources, data.entries, today) : [],
    next: thisYear ? upcomingPayments(data.sources, data.entries, today, addDays(today, NEXT_DAYS - 1)) : [],
    months,
  };
}

export function summarySentence(data: IncomeData, today: string, year: number): SentencePart[] {
  if (data.sources.length === 0) return [{ text: "No income sources yet. Add one, then record what comes in, and this page fills in." }];
  const f = facts(data, today, year);
  const parts: SentencePart[] = [];
  if (f.received === 0) {
    parts.push({ text: f.thisYear ? `Nothing has landed in ${year} yet. ` : `Nothing landed in ${year}. ` });
  } else {
    parts.push({ text: f.thisYear ? "You've received " : "You received " }, { text: formatInr(f.received), strong: true, point: "received" });
    parts.push({ text: f.thisYear ? ` so far in ${year}, about ` : ` in ${year}, about ` }, { text: formatInr(f.average), strong: true, point: "average" }, { text: " a month" });
    if (f.vs.ratio !== undefined && Math.round(f.vs.ratio * 100) !== 0) {
      parts.push({ text: ", " }, { text: `${percent(f.vs.ratio)} ${f.vs.ratio > 0 ? "more" : "less"}`, strong: true, point: "vsLast" }, { text: f.thisYear ? " than at this point last year. " : ` than ${year - 1}. ` });
    } else parts.push({ text: ". " });
    if (f.best && f.months.filter((m) => m.total > 0).length > 1) {
      parts.push({ text: MONTH_NAMES[Number(f.best.month.slice(5, 7)) - 1], strong: true, point: "best" }, { text: " was the biggest month at " }, { text: formatInr(f.best.total), strong: true, point: "best" }, { text: ". " });
    }
  }
  if (!f.thisYear) return trim(parts);
  const late = sumAmounts(f.pending);
  const coming = sumAmounts(f.next);
  if (f.pending.length > 0) {
    const sources = new Set(f.pending.map((p) => p.sourceId));
    const one = sources.size === 1 ? data.sources.find((s) => s.id === f.pending[0].sourceId) : undefined;
    parts.push({ text: formatInr(late), strong: true, point: "late" });
    if (one) parts.push({ text: ` from ${sourceName(one)} is ` }, { text: `${plural(f.pending[0].daysLate, "day")} late`, strong: true, point: "late" });
    else parts.push({ text: ` from ${plural(sources.size, "source")} is ` }, { text: "late", strong: true, point: "late" });
    parts.push({ text: coming > 0 ? ", and " : ". " });
  }
  if (coming > 0) parts.push({ text: formatInr(coming), strong: true, point: "next" }, { text: ` is expected in the next ${NEXT_DAYS} days.` });
  else if (f.pending.length === 0) parts.push({ text: `Nothing is expected in the next ${NEXT_DAYS} days.` });
  return trim(parts);
}

/** No trailing space after the last sentence. */
function trim(parts: SentencePart[]): SentencePart[] {
  const last = parts.at(-1);
  if (last && !last.strong) last.text = last.text.trimEnd();
  return parts;
}

export function greetingView(data: IncomeData, today: string, year: number): IncomeGreetingCards {
  if (data.sources.length === 0) return {};
  const f = facts(data, today, year);
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  const landed = receivedBetween(data.entries, f.from, f.to);
  const bySource = (entries: IncomeEntry[]) => {
    const totals = new Map<string, number>();
    for (const e of entries) totals.set(e.incomeSourceId, (totals.get(e.incomeSourceId) ?? 0) + e.amount);
    return [...totals].sort((a, b) => b[1] - a[1]);
  };
  const cards: IncomeGreetingCards = {};

  if (f.received > 0) {
    const rows = bySource(landed);
    cards.received = {
      title: f.thisYear ? `Received in ${year} so far` : `Received in ${year}`,
      total: formatInr(f.received),
      rows: rows.map(([id, amount]) => ({ key: id, name: sourceName(byId.get(id)), colorKey: colorOf(byId.get(id)), amount: formatInr(amount), note: plural(landed.filter((e) => e.incomeSourceId === id).length, "payment"), fraction: amount / f.received })),
    };
    const monthsCounted = f.thisYear ? Number(today.slice(5, 7)) : 12;
    cards.average = {
      title: "About a month",
      total: formatInr(f.average),
      rows: TAG_SEGMENTS.map((t) => {
        const amount = sumAmounts(landed.filter((e) => e.tag === t.tag)) / monthsCounted;
        return { key: t.tag, name: t.tag === "Regular" ? "Regular pay and interest" : t.tag === "Bonus" ? "Bonuses" : "One-offs", colorKey: t.colorKey, amount: formatInr(amount), fraction: f.average ? amount / f.average : 0 };
      }).filter((r) => r.fraction > 0),
      note: `${formatInr(f.received)} over ${plural(monthsCounted, "month")}${f.thisYear ? ", this one included" : ""}. When every source pays, a month is ${formatInr(totalMonthlyEquivalentIncome(data.sources))}.`,
    };
    if (f.vs.ratio !== undefined && Math.round(f.vs.ratio * 100) !== 0) {
      const lastFrom = `${Number(f.vs.then.slice(0, 4))}-01-01`;
      const before = new Map(bySource(receivedBetween(data.entries, lastFrom, f.vs.then)));
      const now = new Map(bySource(landed));
      const ids = [...new Set([...now.keys(), ...before.keys()])];
      cards.vsLast = {
        title: f.thisYear ? "Against the same days last year" : `Against ${year - 1}`,
        total: `${f.vs.thisYear - f.vs.lastYear >= 0 ? "+" : "−"}${formatInr(Math.abs(f.vs.thisYear - f.vs.lastYear))}`,
        rows: ids
          .map((id) => ({ id, change: (now.get(id) ?? 0) - (before.get(id) ?? 0) }))
          .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
          .map(({ id, change }) => ({ key: id, name: sourceName(byId.get(id)), colorKey: colorOf(byId.get(id)), amount: `${change >= 0 ? "+" : "−"}${formatInr(Math.abs(change))}`, note: `${formatInr(before.get(id) ?? 0)} then, ${formatInr(now.get(id) ?? 0)} now` })),
        note: f.thisYear ? `Jan 1 to ${formatShortDate(today)}, both years` : `${year} against ${year - 1}, whole years`,
      };
    }
    if (f.best) {
      const best = f.best;
      const inBest = landed.filter((e) => (e.receivedDate ?? "").startsWith(best.month));
      cards.best = {
        title: `${formatMonthYear(best.month)}, the biggest month`,
        total: formatInr(best.total),
        rows: bySource(inBest).map(([id, amount]) => ({ key: id, name: sourceName(byId.get(id)), colorKey: colorOf(byId.get(id)), amount: formatInr(amount), note: inBest.filter((e) => e.incomeSourceId === id && e.tag === "Bonus").length ? "bonus included" : undefined })),
        months: f.months.map((m) => ({ key: m.month, label: formatMonthShort(m.month)[0], total: m.total, lit: m.month === best.month })),
      };
    }
  }
  if (f.pending.length > 0) {
    cards.late = {
      title: "Expected, not yet received",
      total: formatInr(sumAmounts(f.pending)),
      rows: f.pending.map((p) => ({ key: `${p.sourceId}-${p.expectedDate}`, name: sourceName(byId.get(p.sourceId)), colorKey: colorOf(byId.get(p.sourceId)), amount: formatInr(p.amount), note: `expected ${formatShortDate(p.expectedDate)} · ${plural(p.daysLate, "day")} late`, warn: true })),
    };
  }
  if (f.next.length > 0) {
    cards.next = {
      title: `The next ${NEXT_DAYS} days`,
      total: formatInr(sumAmounts(f.next)),
      rows: f.next.map((p) => ({ key: `${p.sourceId}-${p.expectedDate}`, name: sourceName(byId.get(p.sourceId)), colorKey: colorOf(byId.get(p.sourceId)), amount: formatInr(p.amount), note: `${formatShortDate(p.expectedDate)} · ${inDays(today, p.expectedDate)}, at the usual amount` })),
    };
  }
  return cards;
}

/** The years the pill offers: this one back to the first with income, newest first. */
export function incomeYears(data: IncomeData, today: string): number[] {
  const now = Number(today.slice(0, 4));
  const first = data.entries.map((e) => e.receivedDate).filter((d): d is string => !!d).sort()[0];
  const start = Math.min(now, first ? Number(first.slice(0, 4)) : now);
  return Array.from({ length: now - start + 1 }, (_, i) => now - i);
}
