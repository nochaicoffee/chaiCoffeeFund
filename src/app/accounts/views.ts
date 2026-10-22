import { comingUp, flows, moneyItems, type AccountsData } from "@/lib/aggregate/accountFlows";
import { PURPOSE_COLORS, accountColor, balanceOn, changeSince, dayBefore, daysSinceBalance, highPoint, isClosed, isStale, periodSpan, sharesOfTotal, STALE_DAYS, totalOn, totalSeries, weeklyDates, type BalanceTrendPoint } from "@/lib/aggregate/accounts";
import { addMonths, monthOf, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { periodPhrase } from "@/lib/aggregate/period";
import { formatDate, formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { optionLabel } from "@/lib/format/labels";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { cardColorKey, whenFrom, type ColorKey } from "@/lib/format/subscriptionLabels";
import type { Account, CardColor } from "@/lib/sheets/types";
import type { MapEntry } from "@/components/subscriptions/costMap";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { detailFor, type PickDetail } from "./detailView";
import type { SentencePart } from "../cards/summarySentence";

/**
 * What the Accounts page shows (docs/design/accounts.md, the final design): one pick per
 * account plus All, each as plain, already-formatted data for the client to draw, so a
 * pick is instant and the greeting reads the very same figures. Built from
 * lib/aggregate/accounts.ts and accountFlows.ts; nothing is worked out here.
 */

export const ALL = "all";

export interface FigureView {
  label: string;
  value: string;
  note?: string;
  /** Amber, for a stale balance. */
  warn?: boolean;
}

export interface LineView {
  /** The total on each date, oldest first (carried forward). */
  points: BalanceTrendPoint[];
  /** The months the line passes, for the labels under it. */
  months: { date: string; label: string }[];
}

export interface PickView {
  id: string;
  kind: "all" | "account";
  /** A --card-<colour>-from / -to token name: the stage and the card take it. */
  colorKey: ColorKey;
  /** The account's name, or "All accounts". */
  name: string;
  bank: string;
  /** The bank's first letter. */
  initial: string;
  purpose: string;
  last4: string | null;
  closed: boolean;
  stale: boolean;
  /** Days since its balance, when it has one. */
  daysSince: number | null;
  noBalance: boolean;
  balance: string;
  /** The balance as a number, for the rolling digits. */
  balanceValue: number;
  /** "Updated Oct 20" / "5 accounts · 4 up to date". */
  updated: string;
  /** Under the balance: "+₹4,200 since the balance before", or "No balance yet". */
  change: string;
  changeTone: "up" | "down" | null;
  line: LineView;
  figures: FigureView[];
  /** What sits under the hero for this pick. */
  detail: PickDetail;
}

/** One account's block in the mix: its balance sized like a subscription's cost in the Subscriptions map, grouped by purpose. */
export interface MixBlock extends MapEntry {
  /** Formatted balance. */
  balanceText: string;
  /** Its share of what's held, 0 to 1. */
  share: number;
  initial: string;
}

/** One recorded balance in Balance history: what it was, how it moved, and how long since the one before. */
export interface HistoryRow {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  dateText: string;
  balanceText: string;
  /** The balance as saved, to start an edit on. */
  balance: number;
  /** "+₹4,200", "−₹1,000", or "First balance". */
  changeText: string;
  changeTone: "up" | "down" | null;
  /** "30 days after the one before". */
  gapText: string | null;
}

/** An account as the forms need it: what to preview, what it holds, and what to pre-fill an edit with. */
export interface FormAccount {
  id: string;
  name: string;
  bank: string;
  initial: string;
  colorKey: ColorKey;
  /** The card colour name an edit starts on. */
  color: CardColor;
  accountType: Account["accountType"];
  purpose: Account["purpose"];
  startDate: string;
  last4: string;
  closed: boolean;
  stale: boolean;
  /** Its balance today, or null with none yet. */
  balance: number | null;
  latestDate: string | null;
  /** Whether a loan's EMIs are paid from it, for Close's warning. */
  paysALoan: boolean;
}

export interface AccountsFormsData {
  demo: boolean;
  today: string;
  accounts: FormAccount[];
  /** What every account holds today, for the check-in's total. */
  total: number;
}

export interface AccountsPageView {
  forms: AccountsFormsData;
  picks: PickView[];
  mix: MixBlock[];
  /** Newest first, by pick id: All has every account's readings. */
  history: Record<string, HistoryRow[]>;
  /** The rest of the page's own data, filled in as each widget is built. */
  hasAccounts: boolean;
}

const lastDay = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

function lineFor(data: AccountsData, scope: Account[], period: SpendPeriod, today: string): LineView {
  const first = data.snapshots.filter((s) => scope.some((a) => a.id === s.accountId)).map((s) => s.date).sort()[0] ?? null;
  const span = periodSpan(period, today, first);
  // The line starts where the pick's first balance is: nothing is drawn before it.
  const from = first && first > span.from ? first : span.from;
  const dates = weeklyDates(from, span.to);
  const points = first ? totalSeries(scope, data.snapshots, dates) : [];
  const months: LineView["months"] = [];
  for (const point of points) {
    const month = monthOf(point.date);
    if (!months.some((m) => monthOf(m.date) === month)) months.push({ date: point.date, label: formatMonthShort(month) });
  }
  return { points, months };
}

function accountPick(data: AccountsData, account: Account, period: SpendPeriod, today: string): PickView {
  const latest = balanceOn(data.snapshots, account.id, today);
  const mine = data.snapshots.filter((s) => s.accountId === account.id);
  const previous = latest ? mine.filter((s) => s.date < latest.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0] : undefined;
  const days = daysSinceBalance(data.snapshots, account.id, today);
  const stale = isStale(account, data.snapshots, today);
  const closed = isClosed(account);
  const span = periodSpan(period, today, mine.map((s) => s.date).sort()[0] ?? null);
  const total = totalOn(data.accounts.filter((a) => !isClosed(a)), data.snapshots, today);
  const held = latest?.balance ?? 0;
  const since = latest ? changeSince([account], data.snapshots, dayBefore(span.from), today) : 0;
  const items = moneyItems(data, latest ? dayBefore(latest.date) : today, today);
  const billsSince = flows(items.filter((i) => i.date > (latest?.date ?? today)), account.id).expenses;
  const delta = latest && previous ? latest.balance - previous.balance : null;
  return {
    id: account.id,
    kind: "account",
    colorKey: closed ? "onyx" : cardColorKey(accountColor(account)),
    name: account.name,
    bank: account.bank,
    initial: account.bank.trim()[0]?.toUpperCase() ?? "?",
    purpose: optionLabel(account.purpose),
    last4: account.last4 ?? null,
    closed,
    stale,
    daysSince: days,
    noBalance: !latest,
    balance: formatInr(held),
    balanceValue: held,
    updated: !latest ? "No balance yet" : closed ? `Closed ${formatShortDate(latest.date)}` : `Updated ${formatShortDate(latest.date)}${stale ? ` · ${days} days ago` : ""}`,
    change: !latest ? "Add its first balance" : delta === null ? "First balance" : delta === 0 ? "No change since the balance before" : `${delta >= 0 ? "+" : "−"}${formatInr(Math.abs(delta))} since the balance before`,
    changeTone: delta === null || delta === 0 ? null : delta > 0 ? "up" : "down",
    line: lineFor(data, [account], period, today),
    detail: detailFor(data, account.id, period, today),
    figures: [
      { label: `Since ${formatShortDate(span.from)}`, value: latest ? `${since >= 0 ? "+" : "−"}${formatInr(Math.abs(since))}` : "—" },
      { label: "Share of the total", value: closed || total <= 0 ? "—" : `${Math.round((held / total) * 100)}%` },
      { label: "Out to bills since its last balance", value: formatInr(billsSince), note: "Worked out" },
      { label: "Updated", value: !latest ? "—" : days === 0 ? "Today" : `${days} days ago`, note: latest ? formatDate(latest.date) : undefined, warn: stale },
    ],
  };
}

function allPick(data: AccountsData, period: SpendPeriod, today: string): PickView {
  const live = data.accounts.filter((a) => !isClosed(a));
  const total = totalOn(data.accounts, data.snapshots, today);
  const firstDate = data.snapshots.map((s) => s.date).sort()[0] ?? null;
  const span = periodSpan(period, today, firstDate);
  const line = lineFor(data, data.accounts, period, today);
  const high = highPoint(line.points);
  const staleOnes = live.filter((a) => isStale(a, data.snapshots, today));
  const latestDate = data.snapshots.map((s) => s.date).filter((d) => d <= today).sort().at(-1) ?? null;
  const since = changeSince(data.accounts, data.snapshots, dayBefore(span.from), today);
  const monthStart = dayBefore(`${monthOf(today)}-01`);
  const thisMonth = total - totalOn(data.accounts, data.snapshots, monthStart);
  const items = moneyItems(data, span.from, span.to);
  const out = flows(items, null);
  const withBalance = live.filter((a) => balanceOn(data.snapshots, a.id, today));
  const upToDate = withBalance.length - staleOnes.length;
  return {
    id: ALL,
    kind: "all",
    colorKey: "emerald",
    name: "All accounts",
    bank: "",
    initial: "",
    purpose: "",
    last4: null,
    closed: false,
    stale: false,
    daysSince: null,
    noBalance: data.snapshots.length === 0,
    balance: formatInr(total),
    balanceValue: total,
    updated: live.length === 0 ? "No accounts yet" : `${live.length} account${live.length === 1 ? "" : "s"} · ${upToDate} up to date`,
    change: data.snapshots.length === 0 ? "Add a balance to begin" : `${since >= 0 ? "+" : "−"}${formatInr(Math.abs(since))} since ${formatShortDate(span.from)}${latestDate ? ` · latest update ${formatShortDate(latestDate)}` : ""}`,
    changeTone: since === 0 ? null : since > 0 ? "up" : "down",
    line,
    detail: detailFor(data, null, period, today),
    figures: [
      { label: "This month", value: `${thisMonth >= 0 ? "+" : "−"}${formatInr(Math.abs(thisMonth))}` },
      { label: "High point", value: high ? formatInr(high.total) : "—", note: high ? formatMonthYear(monthOf(high.date)) : undefined },
      { label: "Out to bills", value: formatInr(out.expenses), note: "Worked out" },
      { label: "Up to date", value: `${upToDate} of ${withBalance.length}`, note: staleOnes.length ? `${staleOnes[0].name} is stale` : undefined, warn: staleOnes.length > 0 },
    ],
  };
}

/** The mix: every open account with a balance above ₹0, biggest first, by purpose. */
export function mixBlocks(data: AccountsData, today: string): MixBlock[] {
  return sharesOfTotal(data.accounts.filter((a) => !isClosed(a)), data.snapshots, today).map(({ account, balance, share }) => ({
    id: account.id,
    alias: account.name,
    color: cardColorKey(accountColor(account)),
    monthly: balance,
    category: account.purpose,
    categoryLabel: optionLabel(account.purpose),
    categoryColor: cardColorKey(PURPOSE_COLORS[account.purpose]),
    balanceText: formatInr(balance),
    share,
    initial: account.bank.trim()[0]?.toUpperCase() ?? "?",
  }));
}

/** Every recorded balance with its change from the one before it, newest first. */
export function historyRows(data: AccountsData): Record<string, HistoryRow[]> {
  const rows = new Map<string, HistoryRow[]>();
  const all: HistoryRow[] = [];
  for (const account of data.accounts) {
    const mine = data.snapshots.filter((s) => s.accountId === account.id).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    const list = mine.map((s, i): HistoryRow => {
      const before = mine[i - 1];
      const delta = before ? s.balance - before.balance : null;
      return {
        id: s.id,
        accountId: account.id,
        accountName: account.name,
        date: s.date,
        dateText: formatDate(s.date),
        balanceText: formatInr(s.balance),
        balance: s.balance,
        changeText: delta === null ? "First balance" : delta === 0 ? "No change" : `${delta > 0 ? "+" : "−"}${formatInr(Math.abs(delta))}`,
        changeTone: delta === null || delta === 0 ? null : delta > 0 ? "up" : "down",
        gapText: before ? `${daysBetween(before.date, s.date)} days after the one before` : null,
      };
    });
    all.push(...list);
    rows.set(account.id, [...list].reverse());
  }
  const newest = (a: HistoryRow, b: HistoryRow) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1);
  return { [ALL]: all.sort(newest), ...Object.fromEntries(rows) };
}

export function formsView(data: AccountsData, today: string, demo: boolean): AccountsFormsData {
  const accounts = [...data.accounts].sort((a, b) => Number(isClosed(a)) - Number(isClosed(b))).map((a): FormAccount => {
    const latest = balanceOn(data.snapshots, a.id, today);
    return {
      id: a.id,
      name: a.name,
      bank: a.bank,
      initial: a.bank.trim()[0]?.toUpperCase() ?? "?",
      colorKey: cardColorKey(accountColor(a)),
      color: accountColor(a),
      accountType: a.accountType,
      purpose: a.purpose,
      startDate: a.startDate,
      last4: a.last4 ?? "",
      closed: isClosed(a),
      stale: isStale(a, data.snapshots, today),
      balance: latest?.balance ?? null,
      latestDate: latest?.date ?? null,
      paysALoan: data.loans.some((l) => l.status === "Active" && l.accountId === a.id),
    };
  });
  return { demo, today, accounts, total: totalOn(data.accounts, data.snapshots, today) };
}

export function accountsPageView(data: AccountsData, today: string, period: SpendPeriod, demo = false): AccountsPageView {
  // Closed accounts come last, as they do in the card row.
  const ordered = [...data.accounts].sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)));
  const live = data.accounts.filter((a) => !isClosed(a));
  const picks = ordered.map((a) => accountPick(data, a, period, today));
  // With one account All would repeat it exactly, so it steps aside (decision 6).
  const showAll = live.length !== 1 || data.accounts.length !== 1;
  const base = { forms: formsView(data, today, demo), mix: mixBlocks(data, today), history: historyRows(data) };
  return { ...base, picks: data.accounts.length === 0 ? [allPick(data, period, today)] : showAll && data.accounts.length > 1 ? [allPick(data, period, today), ...picks] : picks, hasAccounts: data.accounts.length > 0 };
}

// --- The greeting ---

export interface GreetingRow {
  key: string;
  name: string;
  colorKey: ColorKey;
  amount: string;
  note?: string;
  /** 0 to 1, a bar's length. */
  fraction?: number;
  warn?: boolean;
}

export interface AccountsGreetingCards {
  accounts?: { title: string; total: string; rows: GreetingRow[] };
  total?: { title: string; total: string; months: { key: string; label: string; total: number; lit: boolean }[]; note: string };
  since?: { title: string; total: string; rows: GreetingRow[] };
  high?: { title: string; total: string; months: { key: string; label: string; total: number; lit: boolean }[]; note: string };
  stale?: { title: string; rows: GreetingRow[] };
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatInr(Math.abs(n))}`;

/** The month-end totals across a period, the last one being today. */
function monthEnds(data: AccountsData, period: SpendPeriod, today: string): { key: string; label: string; total: number }[] {
  const firstDate = data.snapshots.map((s) => s.date).sort()[0] ?? null;
  const span = periodSpan(period, today, firstDate);
  const months: { key: string; label: string; total: number }[] = [];
  for (let m = monthOf(span.from); m <= monthOf(span.to); m = addMonths(m, 1)) {
    const end = lastDay(m) > span.to ? span.to : lastDay(m);
    months.push({ key: m, label: formatMonthShort(m)[0], total: totalOn(data.accounts, data.snapshots, end) });
  }
  return months;
}

export function summarySentence(data: AccountsData, today: string, period: SpendPeriod): SentencePart[] {
  const live = data.accounts.filter((a) => !isClosed(a));
  if (live.length === 0) return [{ text: "No accounts yet. Add one, then a balance, and this page starts to fill in." }];
  const firstDate = data.snapshots.map((s) => s.date).sort()[0] ?? null;
  if (!firstDate) return [{ text: `You have ${live.length} account${live.length === 1 ? "" : "s"}, with no balances yet. Add each one's balance to see what you hold.` }];
  const span = periodSpan(period, today, firstDate);
  const total = totalOn(data.accounts, data.snapshots, today);
  const since = changeSince(data.accounts, data.snapshots, dayBefore(span.from), today);
  const months = monthEnds(data, period, today);
  const best = months.reduce<(typeof months)[number] | null>((b, m) => (b === null || m.total > b.total ? m : b), null);
  const stale = live.filter((a) => isStale(a, data.snapshots, today));
  const parts: SentencePart[] = [
    { text: "Your " },
    { text: `${live.length} account${live.length === 1 ? "" : "s"}`, strong: true, point: "accounts" },
    { text: " hold " },
    { text: formatInr(total), strong: true, point: "total" },
    { text: since === 0 ? " in all. " : `, ${since > 0 ? "up" : "down"} ` },
  ];
  if (since !== 0) parts.push({ text: formatInr(Math.abs(since)), strong: true, point: "since" }, { text: ` ${periodPhrase(period, today, months[0]?.key)}. ` });
  if (best && months.length > 1) parts.push({ text: formatMonthYear(best.key), strong: true, point: "high" }, { text: ` was the high point at ` }, { text: formatInr(best.total), strong: true, point: "high" }, { text: ". " });
  if (stale.length === 0) parts.push({ text: "Every balance is up to date." });
  else parts.push({ text: stale.length === 1 ? stale[0].name : `${stale.length} accounts`, strong: true, point: "stale" }, { text: ` ${stale.length === 1 ? "hasn't" : "haven't"} been updated in over ${STALE_DAYS} days.` });
  return parts;
}

export function greetingView(data: AccountsData, today: string, period: SpendPeriod): AccountsGreetingCards {
  const live = data.accounts.filter((a) => !isClosed(a));
  const firstDate = data.snapshots.map((s) => s.date).sort()[0] ?? null;
  if (live.length === 0 || !firstDate) return {};
  const span = periodSpan(period, today, firstDate);
  const total = totalOn(data.accounts, data.snapshots, today);
  const shares = sharesOfTotal(live, data.snapshots, today);
  const months = monthEnds(data, period, today);
  const best = months.reduce<(typeof months)[number] | null>((b, m) => (b === null || m.total > b.total ? m : b), null);
  const stale = live.filter((a) => isStale(a, data.snapshots, today));
  const rows = (accounts: Account[], note: (a: Account) => string | undefined, amount: (a: Account) => string, fraction: (a: Account) => number): GreetingRow[] =>
    accounts.map((a) => ({ key: a.id, name: a.name, colorKey: cardColorKey(accountColor(a)), amount: amount(a), note: note(a), fraction: fraction(a), warn: isStale(a, data.snapshots, today) }));
  const byBalance = new Map(shares.map((s) => [s.account.id, s]));
  const since = changeSince(data.accounts, data.snapshots, dayBefore(span.from), today);
  const movers = live
    .map((a) => ({ account: a, change: changeSince([a], data.snapshots, dayBefore(span.from), today) }))
    .filter((m) => m.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const top = Math.max(1, ...movers.map((m) => Math.abs(m.change)));
  return {
    accounts: {
      title: `${live.length} account${live.length === 1 ? "" : "s"}`,
      total: formatInr(total),
      rows: rows(shares.map((s) => s.account), (a) => optionLabel(a.purpose), (a) => formatInr(byBalance.get(a.id)?.balance ?? 0), (a) => byBalance.get(a.id)?.share ?? 0),
    },
    total: { title: "Held today", total: formatInr(total), months: months.map((m) => ({ ...m, lit: m.key === monthOf(today) })), note: `Each balance carried forward until the next one` },
    since: {
      title: `Change ${periodPhrase(period, today, months[0]?.key)}`,
      total: signed(since),
      rows: movers.slice(0, 6).map((m) => ({ key: m.account.id, name: m.account.name, colorKey: cardColorKey(accountColor(m.account)), amount: signed(m.change), fraction: Math.abs(m.change) / top })),
    },
    ...(best && months.length > 1 ? { high: { title: formatMonthYear(best.key), total: formatInr(best.total), months: months.map((m) => ({ ...m, lit: m.key === best.key })), note: "The most you held at a month's end" } } : {}),
    ...(stale.length ? { stale: { title: stale.length === 1 ? "Not updated lately" : `${stale.length} not updated lately`, rows: stale.map((a) => ({ key: a.id, name: a.name, colorKey: cardColorKey(accountColor(a)), amount: `${daysSinceBalance(data.snapshots, a.id, today)} days`, note: `Last read ${whenFrom(today, balanceOn(data.snapshots, a.id, today)!.date)}`, warn: true })) } } : {}),
  };
}

/** What's due next, for the pick, soonest first (the Coming up card). Built here so the page reads one source. */
export function comingUpFor(data: AccountsData, accountId: string | null, today: string) {
  return comingUp(data, accountId, today).map((item) => ({ ...item, amountText: formatInr(item.amount), compact: formatInrCompact(item.amount), dateText: formatShortDate(item.date), when: whenFrom(today, item.date) }));
}
