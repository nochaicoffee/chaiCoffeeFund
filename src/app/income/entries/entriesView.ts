import { daysBetween } from "@/lib/aggregate/cardSpend";
import { monthlyEquivalentIncome, sourceColor } from "@/lib/aggregate/income";
import { daysAfterExpected, nextPayment, onTimeSummary, pendingPayments, sumAmounts, upcomingPayments } from "@/lib/aggregate/incomeSchedule";
import { incomeByMonth, payChanges, receivedBetween, totalReceivedBetween, yearMonths } from "@/lib/aggregate/incomeYear";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { cardColorKey, type ColorKey } from "@/lib/format/colors";
import { formatDayDate, formatMonthShort, formatShortDate, MONTH_NAMES } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { IncomeSource, IncomeTag } from "@/lib/sheets/types";
import { ALL, type IncomeData } from "../views";
import { receivedStatus } from "../widgetsView";

/**
 * The Entries page (#191, docs/design/income.md "The final design"): the E1 Ledger for every source, and the E3
 * Passbook for one. Plain, already-formatted data from lib/aggregate's income math (PRD §8): received payments are
 * the rows in the Sheet; pending and upcoming ones are worked out from each source's schedule and never stored.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nameOf = (s: IncomeSource | undefined) => s?.alias || s?.name || "A deleted source";
const colorOf = (s: IncomeSource | undefined): ColorKey => (s ? cardColorKey(sourceColor(s)) : "onyx");
const TAG_LABELS: Record<IncomeTag, string> = { Regular: "Regular", Bonus: "Bonus", Other: "One-off" };
const afterText = (days: number) => (days <= 0 ? "on the day" : `${plural(days, "day")} after`);
const inDays = (from: string, to: string) => {
  const n = daysBetween(from, to);
  return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
};

/** What's coming up: the next 30 days, today included. */
const NEXT_DAYS = 30;

export interface EntriesTile {
  label: string;
  value: string;
  note: string;
  tone?: "accent" | "warn";
}

export interface EntriesHeader {
  /** The sentence under the title. */
  sentence: { text: string; strong?: boolean }[];
  tiles: EntriesTile[];
}

export function entriesHeader(data: IncomeData, today: string, year: number): EntriesHeader {
  const current = year === Number(today.slice(0, 4));
  const landed = receivedBetween(data.entries, `${year}-01-01`, `${year}-12-31`);
  const pending = current ? pendingPayments(data.sources, data.entries, today) : [];
  const next = current ? upcomingPayments(data.sources, data.entries, today, addDays(today, NEXT_DAYS - 1)) : [];
  const later = current ? upcomingPayments(data.sources, data.entries, today, `${year}-12-31`) : [];
  const sources = new Set(landed.map((e) => e.incomeSourceId)).size;
  const onTime = onTimeSummary(landed);
  const total = sumAmounts(landed);
  const months = current ? Number(today.slice(5, 7)) : 12;
  const owed = pending.length === 0 ? [{ text: "Nothing is pending" }] : [{ text: `${pending.length} ${pending.length === 1 ? "is" : "are"} pending`, strong: true }];
  const toCome = later.length === 0 ? [{ text: ", and nothing else is due this year." }] : [{ text: ", and " }, { text: `${later.length}`, strong: true }, { text: ` ${later.length === 1 ? "is" : "are"} still to come.` }];
  const sentence: EntriesHeader["sentence"] =
    data.sources.length === 0
      ? [{ text: "No income recorded yet. Add a source, then record what comes in, and every payment shows here." }]
      : [
          { text: "Every payment in one place: " },
          ...(landed.length === 0 ? [{ text: `nothing landed in ${year} yet.` }] : [{ text: `${landed.length} in ${year}`, strong: true }, { text: ` across ${plural(sources, "source")}.` }]),
          ...(current ? [{ text: " " }, ...owed, ...toCome] : []),
        ];
  const nextFirst = next[0];
  const nextSource = nextFirst && data.sources.find((s) => s.id === nextFirst.sourceId);
  const firstPending = pending[0];
  const pendingSource = firstPending && data.sources.find((s) => s.id === firstPending.sourceId);
  return {
    sentence,
    tiles: [
      current
        ? { label: `Next ${NEXT_DAYS} days`, value: formatInr(sumAmounts(next)), note: nextFirst ? `${plural(next.length, "payment")} · next ${nameOf(nextSource)} on ${formatShortDate(nextFirst.expectedDate)}` : "nothing scheduled", tone: "accent" }
        : { label: "A month", value: formatInr(total / 12), note: `${formatInr(total)} over 12 months`, tone: "accent" },
      current
        ? { label: "Pending", value: formatInr(sumAmounts(pending)), note: firstPending ? `${plural(pending.length, "payment")} · ${nameOf(pendingSource)}, ${plural(firstPending.daysLate, "day")} late` : "nothing late", tone: pending.length ? "warn" : undefined }
        : { label: "Payments", value: String(landed.length), note: `from ${plural(sources, "source")}` },
      { label: current ? "Received this year" : `Received in ${year}`, value: formatInr(total), note: `${plural(landed.length, "payment")} · ${formatInr(total / months)} a month` },
      { label: "On time", value: onTime.count ? `${onTime.onTime} of ${onTime.count}` : "—", note: onTime.count ? `average ${onTime.averageDaysAfter < 0.05 ? "on the day" : `${onTime.averageDaysAfter.toFixed(1)} days after expected`}` : "nothing received yet" },
    ],
  };
}

// ---------- The Ledger ----------

export type LedgerKind = "pending" | "upcoming" | "received";

export interface LedgerRow {
  key: string;
  kind: LedgerKind;
  sourceId: string;
  name: string;
  /** "Investment · Quarterly". */
  sourceKind: string;
  colorKey: ColorKey;
  icon?: IncomeSource["icon"];
  /** The payday it's for, as a key, and in words: "Sat, Oct 10". */
  expectedDate: string;
  expected: string;
  expectedNote: string;
  amount: string;
  amountNote: string;
  status: { text: string; tone: "good" | "warn" | "late" | "quiet" };
  received?: string;
  receivedNote?: string;
  landsIn?: string;
  tag: string;
  change?: { text: string; up: boolean; note: string };
  /** The Sheet row, for Edit payment. */
  entryId?: string;
  fromStatement: boolean;
  /** The month it belongs to: received by when it landed, the others by their payday. */
  month: string;
  /** Lower-case text the search box matches: the source, the amount and the dates. */
  search: string;
}

/** Every row for the year: what's owed, what's to come (this year only) and what landed, newest first. */
export function ledgerRows(data: IncomeData, today: string, year: number): LedgerRow[] {
  const current = year === Number(today.slice(0, 4));
  const byId = new Map(data.sources.map((s) => [s.id, s]));
  const accountName = (id?: string) => data.accounts.find((a) => a.id === id)?.name;
  const changes = new Map(payChanges(data.entries).map((c) => [c.entryId, c]));
  const base = (sourceId: string) => {
    const s = byId.get(sourceId);
    return { sourceId, name: nameOf(s), sourceKind: s ? `${s.category} · ${s.frequency === "One-Time" ? "One-Time" : s.frequency}` : "", colorKey: colorOf(s), icon: s?.icon };
  };
  const search = (...parts: string[]) => parts.join(" ").toLowerCase();

  const pending: LedgerRow[] = current
    ? pendingPayments(data.sources, data.entries, today).map((p) => {
        const s = byId.get(p.sourceId);
        const b = base(p.sourceId);
        return { ...b, key: `pending-${p.sourceId}-${p.expectedDate}`, kind: "pending", expectedDate: p.expectedDate, expected: formatDayDate(p.expectedDate), expectedNote: `${plural(p.daysLate, "day")} ago`, amount: formatInr(p.amount), amountNote: "expected", status: { text: `${plural(p.daysLate, "day")} late`, tone: "late" }, landsIn: accountName(s?.accountId), tag: "Regular", fromStatement: false, month: p.expectedDate.slice(0, 7), search: search(b.name, formatInr(p.amount), String(p.amount), formatShortDate(p.expectedDate)) };
      })
    : [];
  const upcoming: LedgerRow[] = current
    ? upcomingPayments(data.sources, data.entries, today, `${year}-12-31`).map((u) => {
        const s = byId.get(u.sourceId);
        const b = base(u.sourceId);
        return { ...b, key: `upcoming-${u.sourceId}-${u.expectedDate}`, kind: "upcoming", expectedDate: u.expectedDate, expected: formatDayDate(u.expectedDate), expectedNote: inDays(today, u.expectedDate), amount: formatInr(u.amount), amountNote: "the usual amount", status: { text: inDays(today, u.expectedDate).replace(/^in /, "In "), tone: "quiet" }, landsIn: accountName(s?.accountId), tag: "Regular", fromStatement: false, month: u.expectedDate.slice(0, 7), search: search(b.name, formatInr(u.amount), String(u.amount), formatShortDate(u.expectedDate)) };
      })
    : [];
  const landed = receivedBetween(data.entries, `${year}-01-01`, `${year}-12-31`).sort((a, b) => (b.receivedDate ?? "").localeCompare(a.receivedDate ?? "") || b.expectedDate.localeCompare(a.expectedDate));
  const received: LedgerRow[] = landed.map((e) => {
    const b = base(e.incomeSourceId);
    const after = daysAfterExpected(e) ?? 0;
    const c = changes.get(e.id);
    return {
      ...b,
      key: e.id,
      kind: "received",
      expectedDate: e.expectedDate,
      expected: formatDayDate(e.expectedDate),
      expectedNote: "",
      amount: formatInr(e.amount),
      amountNote: "",
      status: receivedStatus(e),
      received: formatShortDate(e.receivedDate as string),
      receivedNote: afterText(after),
      landsIn: accountName(e.accountId),
      tag: TAG_LABELS[e.tag],
      ...(c && { change: { text: `${c.change > 0 ? "↑" : "↓"} ${formatInr(Math.abs(c.change))}`, up: c.change > 0, note: `${c.ratio > 0 ? "+" : "−"}${Math.round(Math.abs(c.ratio) * 100)}% on the one before` } }),
      entryId: e.id,
      fromStatement: e.origin === "Statement",
      month: (e.receivedDate as string).slice(0, 7),
      search: search(b.name, formatInr(e.amount), String(e.amount), formatShortDate(e.receivedDate as string), formatShortDate(e.expectedDate), TAG_LABELS[e.tag]),
    };
  });
  return [...pending, ...upcoming, ...received];
}

/** A month's heading in the Ledger: "October 2026", and what landed in it. */
export function monthTitle(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

// ---------- The Passbook ----------

export interface PassbookItem {
  key: string;
  /** "Oct 1". */
  date: string;
  /** Shown when it's not the year being read: "2027". */
  otherYear?: string;
  title: string;
  status?: { text: string; tone: "good" | "warn" | "late" | "quiet" };
  note: string;
  amount: string;
  change?: { text: string; up: boolean };
  state: "received" | "pending" | "upcoming";
  entryId?: string;
  /** The payday it's for: what Mark received opens on. */
  expectedDate: string;
}

export interface Passbook {
  id: string;
  name: string;
  /** "Salary · Monthly · lands in HDFC Salary". */
  facts: string;
  colorKey: ColorKey;
  icon?: IncomeSource["icon"];
  inactive: boolean;
  figures: EntriesTile[];
  months: { key: string; label: string; amount: number; short: string; expected: boolean; current: boolean }[];
  items: PassbookItem[];
  changes: { key: string; when: string; amounts: string; change: string; up: boolean }[];
}

export function passbook(data: IncomeData, today: string, year: number, sourceId: string): Passbook | undefined {
  const s = data.sources.find((x) => x.id === sourceId);
  if (!s) return undefined;
  const current = year === Number(today.slice(0, 4));
  const entries = data.entries.filter((e) => e.incomeSourceId === s.id);
  const landed = receivedBetween(entries, `${year}-01-01`, `${year}-12-31`);
  const account = data.accounts.find((a) => a.id === s.accountId);
  const changes = payChanges(entries);
  const lastRaise = changes.find((c) => c.change > 0 && c.tag === "Regular");
  const next = s.status === "Active" ? nextPayment(s, data.entries, today) : undefined;
  const onTime = onTimeSummary(landed);
  const pending = current ? pendingPayments([s], data.entries, today) : [];
  const upcoming = current ? upcomingPayments([s], data.entries, today, addDays(today, 100)) : [];
  const byMonth = incomeByMonth(landed, year);
  const scheduledLater = current ? upcomingPayments([s], data.entries, today, `${year}-12-31`) : [];

  const title = (date: string) => `${MONTH_NAMES[Number(date.slice(5, 7)) - 1]} · ${nameOf(s)}`;
  const items: PassbookItem[] = [
    ...upcoming
      .slice()
      .reverse()
      .map((u): PassbookItem => ({ key: `u-${u.expectedDate}`, date: formatShortDate(u.expectedDate), ...(u.expectedDate.slice(0, 4) !== String(year) && { otherYear: u.expectedDate.slice(0, 4) }), title: title(u.expectedDate), status: { text: inDays(today, u.expectedDate).replace(/^in /, "In "), tone: "quiet" }, note: "the usual amount", amount: formatInr(u.amount), state: "upcoming", expectedDate: u.expectedDate })),
    ...pending
      .slice()
      .reverse()
      .map((p): PassbookItem => ({ key: `p-${p.expectedDate}`, date: formatShortDate(p.expectedDate), title: title(p.expectedDate), status: { text: `${plural(p.daysLate, "day")} late`, tone: "late" }, note: `expected ${formatShortDate(p.expectedDate)} · not landed yet`, amount: formatInr(p.amount), state: "pending", expectedDate: p.expectedDate })),
    ...landed
      .slice()
      .sort((a, b) => (b.receivedDate ?? "").localeCompare(a.receivedDate ?? ""))
      .map((e): PassbookItem => {
        const c = changes.find((x) => x.entryId === e.id);
        const after = daysAfterExpected(e) ?? 0;
        return {
          key: e.id,
          date: formatShortDate(e.receivedDate as string),
          title: e.tag === "Bonus" ? `${MONTH_NAMES[Number((e.receivedDate as string).slice(5, 7)) - 1]} · bonus` : title(e.expectedDate),
          status: receivedStatus(e),
          note: [`expected ${formatShortDate(e.expectedDate)}`, afterText(after), data.accounts.find((a) => a.id === e.accountId)?.name && `into ${data.accounts.find((a) => a.id === e.accountId)!.name}`, e.origin === "Statement" && "from a statement"].filter(Boolean).join(" · "),
          amount: formatInr(e.amount),
          ...(c && { change: { text: `${c.ratio > 0 ? "+" : "−"}${Math.round(Math.abs(c.ratio) * 1000) / 10}%`, up: c.change > 0 } }),
          state: "received",
          entryId: e.id,
          expectedDate: e.expectedDate,
        };
      }),
  ];

  return {
    id: s.id,
    name: s.name,
    facts: [`${s.category} · ${s.frequency === "One-Time" ? "once" : s.frequency.toLowerCase()}`, account && `lands in ${account.name}`, s.status !== "Active" && "inactive"].filter(Boolean).join(" · "),
    colorKey: colorOf(s),
    icon: s.icon,
    inactive: s.status !== "Active",
    figures: [
      { label: current ? `Received ${year}` : `Received in ${year}`, value: formatInr(sumAmounts(landed)), note: plural(landed.length, "payment") },
      { label: "Usual amount", value: formatInr(s.expectedAmount), note: s.frequency === "One-Time" ? "once" : s.frequency === "Monthly" ? "a month" : `${formatInr(monthlyEquivalentIncome(s))} a month` },
      lastRaise ? { label: "Last raise", value: `+${formatInr(lastRaise.change)}`, note: `from ${formatShortDate(lastRaise.receivedDate)} · up ${Math.round(lastRaise.ratio * 1000) / 10}%`, tone: "accent" } : { label: "Last raise", value: "—", note: "no rise yet" },
      next ? { label: "Next", value: formatShortDate(next.expectedDate), note: next.pending ? `${plural(daysBetween(next.expectedDate, today), "day")} late` : inDays(today, next.expectedDate), tone: next.pending ? "warn" : undefined } : { label: "Next", value: "—", note: s.status === "Active" ? "nothing scheduled" : "inactive" },
      { label: "On time", value: onTime.count ? `${onTime.onTime} of ${onTime.count}` : "—", note: onTime.count ? `average ${onTime.averageDaysAfter < 0.05 ? "on the day" : `${onTime.averageDaysAfter.toFixed(1)} days after`}` : "nothing received" },
    ],
    months: yearMonths(year).map((key, i) => {
      const got = byMonth[i].total;
      const expected = got ? 0 : sumAmounts(scheduledLater.filter((u) => u.expectedDate.startsWith(key)));
      const amount = got || expected;
      return { key, label: formatMonthShort(key), amount, short: amount ? formatInrCompact(amount) : "", expected: !got && expected > 0, current: key === today.slice(0, 7) };
    }),
    items,
    changes: changes.map((c) => ({ key: c.entryId, when: formatShortDate(c.receivedDate) + " " + c.receivedDate.slice(0, 4), amounts: `${formatInr(c.from)} → ${formatInr(c.to)}`, change: `${c.ratio > 0 ? "+" : "−"}${Math.round(Math.abs(c.ratio) * 1000) / 10}%`, up: c.change > 0 })),
  };
}

/** The Passbook's list of sources: all sources first, then each, active first, biggest this year first. */
export function passbookSources(data: IncomeData, year: number): { id: string; name: string; note: string; colorKey: ColorKey; icon?: IncomeSource["icon"]; inactive: boolean }[] {
  const total = (id: string) => totalReceivedBetween(data.entries.filter((e) => e.incomeSourceId === id), `${year}-01-01`, `${year}-12-31`);
  const all = receivedBetween(data.entries, `${year}-01-01`, `${year}-12-31`);
  return [
    { id: ALL, name: "All sources", note: `${plural(all.length, "entry", "entries")} · ${formatInr(sumAmounts(all))}`, colorKey: "emerald" as ColorKey, inactive: false },
    ...[...data.sources]
      .sort((a, b) => Number(a.status !== "Active") - Number(b.status !== "Active") || total(b.id) - total(a.id))
      .map((s) => ({ id: s.id, name: nameOf(s), note: `${s.frequency === "One-Time" ? "One-Time" : s.frequency} · ${formatInr(total(s.id))}`, colorKey: colorOf(s), icon: s.icon, inactive: s.status !== "Active" })),
  ];
}
