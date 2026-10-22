import { historyEntries, historySummary, listEntries, monthGroups, paginate, scopeEntries, statusCounts, type HistoryEntry, type HistoryStatus } from "@/lib/aggregate/accountHistory";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { accountColor, balanceOn, isClosed } from "@/lib/aggregate/accounts";
import { periodLabel } from "@/lib/aggregate/period";
import { formatDate, formatDayDate, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { optionLabel } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { cardColorKey, type ColorKey } from "@/lib/format/subscriptionLabels";
import { ACCOUNT_PURPOSES } from "@/lib/forms/accountForms";
import type { SelectOption } from "@/components/Select";
import type { HistoryRow } from "../views";
import type { HistoryState } from "./params";

/**
 * What the Balance history page shows (#177, layout H1 in docs/design/accounts.md): the sentence,
 * four tiles, the filters with their counts, and the rows grouped by month with a page of them,
 * as plain, already-formatted data. lib/aggregate/accountHistory.ts does the work.
 */

export interface Part {
  text: string;
  strong?: boolean;
}

export interface TileView {
  label: string;
  value: string;
  unit?: string;
  warning?: boolean;
  tone?: "positive" | "negative";
  caption: Part[];
}

export interface HistoryRowView {
  id: string;
  accountId: string;
  name: string;
  bank: string;
  last4: string | null;
  colorKey: ColorKey;
  initial: string;
  closed: boolean;
  dateText: string;
  gapText: string | null;
  balanceText: string;
  changeText: string;
  changeTone: "up" | "down" | null;
  pill: "First balance" | "Closing balance" | null;
  /** What the Edit and Delete dialogs start from. */
  row: HistoryRow;
}

export interface GroupView {
  key: string;
  title: string;
  note: string;
  rows: HistoryRowView[];
}

export type EmptyAction = "clear-filters" | "show-all-time" | "update-balances" | "go-accounts";

export interface HistoryPageView {
  lede: Part[];
  tiles: TileView[];
  statuses: { value: HistoryStatus; label: string; count: number }[];
  accounts: SelectOption[];
  purposes: SelectOption[];
  groups: GroupView[];
  page: { page: number; pages: number; from: number; to: number; total: number };
  footer: Part[];
  empty: { title: string; body: string; action: EmptyAction } | null;
  /** Whether any filter beyond the period is on, so the list can offer to clear them. */
  filtered: boolean;
}

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatInr(Math.abs(n))}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function rowView(e: HistoryEntry): HistoryRowView {
  const changeText = e.delta === null ? "First balance" : e.delta === 0 ? "No change" : signed(e.delta);
  const changeTone = e.delta === null || e.delta === 0 ? null : e.delta > 0 ? ("up" as const) : ("down" as const);
  const gapText = e.gapDays === null ? null : e.gapDays === 0 ? "the same day as the one before" : `${plural(e.gapDays, "day")} after the one before`;
  return {
    id: e.id,
    accountId: e.account.id,
    name: e.account.name,
    bank: e.account.bank,
    last4: e.account.last4 ?? null,
    colorKey: isClosed(e.account) ? "onyx" : cardColorKey(accountColor(e.account)),
    initial: e.account.bank.trim()[0]?.toUpperCase() ?? "?",
    closed: isClosed(e.account),
    dateText: formatDayDate(e.date),
    gapText,
    balanceText: formatInr(e.balance),
    changeText,
    changeTone,
    pill: e.closing ? "Closing balance" : e.first ? "First balance" : null,
    row: { id: e.id, accountId: e.account.id, accountName: e.account.name, date: e.date, dateText: formatDate(e.date), balanceText: formatInr(e.balance), balance: e.balance, changeText, changeTone, gapText },
  };
}

export function historyPageView(data: AccountsData, state: HistoryState, today: string): HistoryPageView {
  const entries = historyEntries(data.accounts, data.snapshots);
  const scoped = scopeEntries(entries, state, today);
  // What's stale follows the account and purpose chosen, as the rest of the tiles do.
  const scopeAccounts = data.accounts.filter((a) => (!state.accountId || a.id === state.accountId) && (!state.purpose || a.purpose === state.purpose));
  const summary = historySummary(scoped, scopeAccounts, data.snapshots, today);
  const counts = statusCounts(scoped);
  const list = listEntries(scoped, state.status, state.sort);
  const paged = paginate(list, state.page);
  const when = periodLabel(state.period, today);
  const accountsIn = new Set(scoped.map((e) => e.account.id)).size;
  const filtered = Boolean(state.accountId || state.purpose || state.search || state.status !== "all");
  const only = state.accountId ? data.accounts.find((a) => a.id === state.accountId) : undefined;

  const lede: Part[] =
    scoped.length === 0
      ? [{ text: `No balances recorded ${when}${filtered ? " that match" : ""}.` }]
      : [
          { text: "Every balance you've recorded: " },
          { text: `${scoped.length} ${when}`, strong: true },
          { text: only ? ` for ${only.name}. ` : ` across ${plural(accountsIn, "account")}. ` },
          { text: String(summary.rises), strong: true },
          { text: " went up, " },
          { text: String(summary.falls), strong: true },
          { text: " went down" },
          ...(summary.stale.length && !only ? [{ text: ", and " }, { text: summary.stale.map((a) => a.name).join(", "), strong: true }, { text: ` ${summary.stale.length === 1 ? "hasn't" : "haven't"} been updated in over 30 days.` }] : [{ text: "." }]),
        ];

  const staleFirst = summary.stale[0];
  const staleDate = staleFirst ? balanceOn(data.snapshots, staleFirst.id, today)?.date : undefined;
  const tiles: TileView[] = [
    { label: "Recorded " + when, value: String(summary.recorded), caption: [{ text: `${summary.rises} up · ${summary.falls} down · ${summary.other} first, closing or flat` }] },
    summary.biggest
      ? { label: "Biggest move", value: signed(summary.biggest.delta!), tone: summary.biggest.delta! > 0 ? "positive" : "negative", caption: [{ text: summary.biggest.account.name, strong: true }, { text: ` · ${formatShortDate(summary.biggest.date)}` }] }
      : { label: "Biggest move", value: "—", caption: [{ text: "Nothing has changed yet" }] },
    summary.stale.length
      ? { label: "Not read lately", value: String(summary.stale.length), unit: summary.stale.length === 1 ? "account" : "accounts", warning: true, caption: [{ text: staleFirst.name, strong: true }, { text: staleDate ? ` · last read ${formatShortDate(staleDate)}` : "" }] }
      : { label: "Not read lately", value: "0", unit: "accounts", caption: [{ text: "Every balance is up to date" }] },
    summary.averageGap === null
      ? { label: "Between readings", value: "—", caption: [{ text: "Needs two balances for one account" }] }
      : { label: "Between readings", value: String(summary.averageGap), unit: "days", caption: [{ text: "On average, across the balances shown" }] },
  ];

  // A month's figures are the whole month's, though a page may show only some of its rows.
  const whole = new Map(monthGroups(list, state.sort).map((g) => [g.key, g]));
  const groups: GroupView[] = monthGroups(paged.items, state.sort).map((g) => {
    const month = whole.get(g.key) ?? g;
    return {
      key: g.key,
      title: g.key === "biggest" ? "Biggest moves first" : formatMonthYear(g.key),
      note: g.key === "biggest" ? plural(month.entries.length, "balance") : `${plural(month.entries.length, "balance")} · net ${signed(month.net)}`,
      rows: g.entries.map(rowView),
    };
  });

  const inScope = scopeEntries(entries, { period: state.period }, today);
  let empty: HistoryPageView["empty"] = null;
  if (paged.total === 0) {
    if (data.accounts.length === 0) empty = { title: "No accounts yet", body: "Add an account on the Accounts page, then record its balance, and its history builds here.", action: "go-accounts" };
    else if (data.snapshots.length === 0) empty = { title: "No balances recorded yet", body: "Record what each account holds. Every balance you save stays here, with how it moved.", action: "update-balances" };
    else if (filtered && inScope.length > 0) empty = { title: "No balances match", body: "Nothing in this period matches those filters.", action: "clear-filters" };
    else empty = { title: `No balances ${when}`, body: "No balance was recorded in this period. Show all time to see the rest.", action: "show-all-time" };
  }

  const purposeCount = (purpose: string) => scopeEntries(entries, { period: state.period, accountId: state.accountId, search: state.search }, today).filter((e) => e.account.purpose === purpose).length;
  const accountCount = (id: string) => scopeEntries(entries, { period: state.period, purpose: state.purpose, search: state.search }, today).filter((e) => e.account.id === id).length;

  return {
    lede,
    tiles,
    statuses: [
      { value: "all", label: "All", count: counts.all },
      { value: "rises", label: "Rises", count: counts.rises },
      { value: "falls", label: "Falls", count: counts.falls },
      { value: "first", label: "First & closing", count: counts.first },
    ],
    accounts: [{ value: "", label: "All accounts" }, ...[...data.accounts].sort((a, b) => Number(isClosed(a)) - Number(isClosed(b))).map((a): SelectOption => ({ value: a.id, label: a.name, meta: String(accountCount(a.id)) }))],
    purposes: [{ value: "", label: "Any purpose" }, ...ACCOUNT_PURPOSES.map((p): SelectOption => ({ value: p, label: optionLabel(p), meta: String(purposeCount(p)) }))],
    groups,
    page: { page: paged.page, pages: paged.pages, from: paged.from, to: paged.to, total: paged.total },
    footer: paged.total
      ? [{ text: `Showing ${paged.from}–${paged.to} of ` }, { text: String(paged.total), strong: true }, { text: ". A balance's change is measured from the account's balance before it, so a month's net leaves out first balances." }]
      : [],
    empty,
    filtered,
  };
}
