import type { SentencePart } from "@/app/cards/summarySentence";
import { latestBalances } from "@/lib/aggregate/accounts";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { computeCardSummaries } from "@/lib/aggregate/cards";
import { totalMonthlyEquivalentIncome } from "@/lib/aggregate/income";
import { viewPolicies, coverByKind, isLive } from "@/lib/aggregate/insurance";
import { computeLoanSummaries } from "@/lib/aggregate/loans";
import { summariseLentLoan } from "@/lib/aggregate/lentOut";
import { monthlyObligations, paidThisMonth } from "@/lib/aggregate/obligations";
import { totalMonthlySubscriptionSpend } from "@/lib/aggregate/subscriptions";
import type { WorthSeriesPoint } from "@/lib/aggregate/netWorthOn";
import { cardName } from "@/lib/format/labels";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { formatMonthShort, formatShortDate } from "@/lib/format/date";
import type { ColorKey } from "@/lib/format/colors";
import { loanColor } from "@/lib/aggregate/loans";
import { cardColorKey } from "@/lib/format/colors";
import type { OverviewModel } from "./model";
import { PAGE_HREF, PAGE_NAME, warningCounts, type OverviewWarning, type WarningPage, type WarningTone } from "./warnings";
import { GLYPH_FOR, type GlyphKey } from "./glyphs";

/**
 * What the Overview shows (docs/design/overview.md, board OvT1), as plain, already-formatted data: the greeting's sentence and the cards its
 * figures point at, the net worth block (every month it can be clicked to) and the twelve tiles. The numbers come from lib/aggregate; this
 * file only reads them and words them.
 */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const signed = (n: number) => `${n < 0 ? "−" : "+"}${formatInrCompact(Math.abs(n))}`;
const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;

// ---------- The greeting ----------

export type OverviewPoint = "net" | "month" | "year" | "left" | "look";
export interface GreetingCard {
  title: string;
  total: string;
  rows: { key: string; name: string; colorKey: string; amount: string; note?: string }[];
  note?: string;
}
export type OverviewGreetingCards = Partial<Record<OverviewPoint, GreetingCard>>;

/** What is still to pay this month, and what has been paid: Overview's "Monthly obligations" figure and the sums behind it. */
export function monthFigures(m: OverviewModel): { stillToPay: number; paid: number; due: number } {
  const { data, today } = m;
  const yearMonth = today.slice(0, 7);
  const stillToPay = monthlyObligations({ subscriptions: data.subscriptions, cards: data.cards, loans: data.loans, loanInstallments: data.loanInstallments, cardSummaries: computeCardSummaries(data.cards, data.statements, today), yearMonth });
  const paid = paidThisMonth({ loanInstallments: data.loanInstallments, statements: data.statements, yearMonth });
  return { stillToPay, paid, due: stillToPay + paid };
}

export function summarySentence(m: OverviewModel, warnings: OverviewWarning[]): SentencePart[] {
  const { worth, change } = m;
  const { stillToPay } = monthFigures(m);
  const counts = warningCounts(warnings);
  const parts: SentencePart[] = [{ text: "You're worth " }, { text: formatInr(worth.netWorth), strong: true, point: "net" }];
  if (change.month) {
    parts.push({ text: change.month.amount >= 0 ? ", up " : ", down " }, { text: formatInrCompact(Math.abs(change.month.amount)), strong: true, point: "month" }, { text: " on last month" });
  }
  if (change.year) {
    parts.push({ text: change.month ? " and " : ", " }, { text: formatInrCompact(Math.abs(change.year.amount)), strong: true, point: "year" }, { text: change.year.fullYear ? ` ${change.year.amount >= 0 ? "up" : "down"} on a year ago` : ` ${change.year.amount >= 0 ? "up" : "down"} since ${formatMonthShort(change.year.from)}` });
  }
  parts.push({ text: ". " });
  if (stillToPay > 0) parts.push({ text: formatInr(stillToPay), strong: true, point: "left" }, { text: " is still to pay this month" });
  else parts.push({ text: "Nothing is left to pay this month" });
  if (counts.total > 0) {
    parts.push({ text: ", and " }, { text: plural(counts.total, "thing"), strong: true, point: "look" }, { text: counts.red > 0 ? ` to keep in mind, ${counts.red} of them today.` : " to keep in mind." });
  } else {
    parts.push({ text: ", and nothing needs a look." });
  }
  return parts;
}

export function greetingView(m: OverviewModel, warnings: OverviewWarning[]): OverviewGreetingCards {
  const { worth, change, series, data, today } = m;
  const cards: OverviewGreetingCards = {};
  cards.net = {
    title: "Net worth",
    total: formatInr(worth.netWorth),
    rows: [
      { key: "owned", name: "What you own", colorKey: "emerald", amount: formatInr(worth.netWorth + worth.cardOutstanding + worth.loanOutstanding) },
      { key: "owed", name: "What you owe", colorKey: "ruby", amount: `−${formatInr(worth.cardOutstanding + worth.loanOutstanding)}` },
    ],
    note: "Investments at today's prices (cost where one has no price), EPF at the passbook figure, dollar accounts at today's rate. Subscriptions never count.",
  };
  const moveRows = (from: WorthSeriesPoint | undefined) => {
    const now = series.at(-1);
    if (!from || !now) return [];
    return [
      { key: "own", name: "What you own moved by", colorKey: "emerald", amount: signed(now.owned - from.owned) },
      { key: "owe", name: "What you owe moved by", colorKey: "ruby", amount: signed(now.owed - from.owed) },
    ];
  };
  if (change.month) {
    const from = series.find((p) => p.month === change.month!.from);
    cards.month = { title: `Since the end of ${formatMonthShort(change.month.from)}`, total: `${change.month.amount >= 0 ? "+" : "−"}${formatInr(Math.abs(change.month.amount))}`, rows: moveRows(from), note: change.month.fraction === null ? undefined : `${pct(Math.abs(change.month.fraction))} on ${formatMonthShort(change.month.from)}'s month-end figure.` };
  }
  if (change.year) {
    const from = series.find((p) => p.month === change.year!.from);
    cards.year = { title: change.year.fullYear ? "Against a year ago" : `Since ${formatMonthShort(change.year.from)}`, total: `${change.year.amount >= 0 ? "+" : "−"}${formatInr(Math.abs(change.year.amount))}`, rows: moveRows(from), note: change.year.fullYear ? undefined : "The trend is rebuilt from your records, so it goes back as far as they do." };
  }
  const { stillToPay, paid } = monthFigures(m);
  if (stillToPay > 0) {
    const rows: GreetingCard["rows"] = [];
    for (const s of computeCardSummaries(data.cards, data.statements, today)) if (s.card.status === "Active" && s.outstandingBalance > 0) rows.push({ key: s.card.id, name: cardName(s.card), colorKey: cardColorKey(s.card.color), amount: formatInr(s.outstandingBalance), note: "card bill" });
    for (const l of computeLoanSummaries(data.loans, data.loanInstallments)) if (l.loan.status === "Active" && l.nextDueInstallment?.dueDate.startsWith(today.slice(0, 7))) rows.push({ key: l.loan.id, name: `${l.loan.name} EMI`, colorKey: loanColor(l.loan).toLowerCase(), amount: formatInr(l.nextDueInstallment.totalDue), note: `due ${formatShortDate(l.nextDueInstallment.dueDate)}` });
    cards.left = { title: "Still to pay this month", total: formatInr(stillToPay), rows, note: paid > 0 ? `${formatInr(paid)} already paid this month. Subscriptions on a card are inside that card's bill, so they're counted once.` : "Subscriptions on a card are inside that card's bill, so they're counted once." };
  }
  const counts = warningCounts(warnings);
  if (counts.total > 0) {
    cards.look = {
      title: "Keep in mind",
      total: plural(counts.total, "thing"),
      rows: [
        { key: "red", name: "Act now", colorKey: "ruby", amount: String(counts.red) },
        { key: "amber", name: "Soon, or off", colorKey: "amber", amount: String(counts.amber) },
        { key: "info", name: "Worth knowing", colorKey: "sapphire", amount: String(counts.info) },
      ].filter((r) => r.amount !== "0"),
      note: "Every warning the ten pages raise, in one list, each tagged with its page.",
    };
  }
  return cards;
}

// ---------- Net worth ----------

export interface TypeChip { key: string; name: string; amount: number; amountText: string; colorKey: ColorKey; owe: boolean }
export interface MonthView {
  /** "2026-11". */
  key: string;
  label: string;
  /** "November 2026", or "today" for the last. */
  full: string;
  today: boolean;
  net: number;
  owned: number;
  owed: number;
  /** The change on the month before, and on the first month of the series; null where there is none. */
  vsPrev: { amount: number; text: string; from: string } | null;
  sinceFirst: { amount: number; text: string; from: string } | null;
  chips: TypeChip[];
}
export interface NetWorthView {
  months: MonthView[];
  /** The investments counted at cost for want of a price, so the block can say so. */
  note: string | null;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function chipsFor(p: WorthSeriesPoint): TypeChip[] {
  const own: TypeChip[] = [
    { key: "bank", name: "Bank and brokers", amount: p.bank, amountText: formatInrCompact(p.bank), colorKey: "sapphire", owe: false },
    { key: "invest", name: "Investments", amount: p.investments ?? 0, amountText: formatInrCompact(p.investments ?? 0), colorKey: "indigo", owe: false },
    { key: "fixed", name: "Fixed income", amount: p.fixedIncome, amountText: formatInrCompact(p.fixedIncome), colorKey: "forest", owe: false },
    { key: "lent", name: "Lent out", amount: p.lentOut, amountText: formatInrCompact(p.lentOut), colorKey: "copper", owe: false },
  ];
  const owe: TypeChip[] = [
    ...p.loans.map((l) => ({ key: `loan-${l.id}`, name: l.name, amount: l.amount, amountText: `−${formatInrCompact(l.amount)}`, colorKey: loanColor({ category: l.category }).toLowerCase() as ColorKey, owe: true })),
    { key: "cards", name: "Card bills", amount: p.cards, amountText: `−${formatInrCompact(p.cards)}`, colorKey: "ruby" as ColorKey, owe: true },
  ];
  return [...own.filter((c) => c.amount > 0), ...owe.filter((c) => c.amount > 0)];
}

export function netWorthView(m: OverviewModel): NetWorthView | null {
  const { series, today } = m;
  if (series.length === 0) return null;
  const first = series[0];
  const months = series.map((p, i): MonthView => {
    const prev = series[i - 1];
    const isToday = i === series.length - 1;
    const month = Number(p.month.slice(5, 7)) - 1;
    const move = (from: WorthSeriesPoint) => ({ amount: p.net - from.net, text: `${p.net - from.net >= 0 ? "+" : "−"}${formatInrCompact(Math.abs(p.net - from.net))}`, from: `${MONTH_NAMES[Number(from.month.slice(5, 7)) - 1]} ${from.month.slice(0, 4)}` });
    // Today's point is net worth as the page counts it today (the same figure as the sentence), not a month-end.
    const net = isToday ? m.worth.netWorth : p.net;
    return {
      key: p.month,
      label: formatMonthShort(p.month),
      full: isToday ? "today" : `${MONTH_NAMES[month]} ${p.month.slice(0, 4)}`,
      today: isToday,
      net,
      owned: p.owned,
      owed: p.owed,
      vsPrev: prev ? move(prev) : null,
      sinceFirst: i > 0 ? move(first) : null,
      chips: chipsFor(p),
    };
  });
  void today;
  return { months, note: m.data.pricesFailed ? "Holdings are counted at cost: the saved prices couldn't be read." : null };
}

// ---------- The twelve tiles ----------

export type TileKey = WarningPage | "due" | "spent";
export interface TileCard {
  title: string;
  total: string;
  detail?: string;
  rows: { name: string; amount: string }[];
  foot?: string;
}
export interface TileView {
  key: TileKey;
  group: string;
  name: string;
  /** The headline figure: "₹30.69L". */
  value: string;
  /** "a month", "cover", "set aside". */
  per?: string;
  tag: string;
  owe: boolean;
  sub: string;
  href: string;
  colorKey: ColorKey;
  glyph: GlyphKey;
  /** The tones of the warnings its page has, for the dots. */
  flags: WarningTone[];
  card: TileCard;
}

const GROUP: Record<TileKey, string> = { accounts: "Assets", invest: "Assets", fixed: "Assets", lent: "Assets", cards: "Debts", loans: "Debts", income: "Cash flow", subs: "Cash flow", goals: "Plans and cover", ins: "Plans and cover", due: "This month", spent: "This month" };

/** The Expenses page's own words for its tile (app/expenses/views.ts, spentTile), or null when its tabs couldn't be read. */
export interface SpentTileInput {
  value: string;
  tag: string;
  sub: string;
  card: TileCard;
}

export function tilesView(m: OverviewModel, warnings: OverviewWarning[], spent: SpentTileInput | null = null): TileView[] {
  const { data, worth, today, investments } = m;
  const byPage = warningCounts(warnings).byPage;
  const flags = (page: WarningPage) => (byPage[page] ?? []).map((w) => w.tone);
  const tile = (t: Omit<TileView, "group" | "href" | "flags" | "glyph"> & { page?: WarningPage; href?: string }): TileView => ({ group: GROUP[t.key], href: t.href ?? (t.page ? PAGE_HREF[t.page] : "/"), flags: t.page ? flags(t.page) : [], glyph: GLYPH_FOR[t.key], ...t });
  const balances = latestBalances(data.accounts, data.balanceSnapshots);
  const activeAccounts = data.accounts.filter((a) => a.status === "Active");
  const cardSummaries = computeCardSummaries(data.cards, data.statements, today);
  const loanSummaries = computeLoanSummaries(data.loans, data.loanInstallments).filter((l) => l.loan.status === "Active");
  const { stillToPay, paid, due } = monthFigures(m);
  const nextDue = cardSummaries.map((s) => data.statements.filter((x) => x.cardId === s.card.id && x.status === "Pending").map((x) => x.dueDate).sort()[0]).filter(Boolean).sort()[0];

  const holdings = investments.holdings.slice(0, 5);
  const lentSummaries = data.lent.loans.filter((l) => l.status !== "Repaid").map((l) => ({ loan: l, s: summariseLentLoan(l, data.lent.repayments, today) }));
  const views = data.insurance.failed ? [] : viewPolicies(data.insurance.policies, data.insurance.payments, today).filter(isLive);
  const cover = Object.values(coverByKind(views)).reduce((a, b) => a + b, 0);
  const goals = data.goals.goals.filter((g) => !g.parentId && (g.status === "Active" || g.status === "Paused"));
  const activeSubs = data.subscriptions.filter((s) => s.status === "Active");
  const incomeMonthly = totalMonthlyEquivalentIncome(data.incomeSources);

  const tiles: TileView[] = [
    tile({ key: "accounts", page: "accounts", name: "Accounts", value: formatInrCompact(worth.bankBalances), tag: "yours", owe: false, sub: plural(activeAccounts.length, "account"), colorKey: "sapphire",
      card: { title: "Accounts", total: formatInr(worth.bankBalances), rows: activeAccounts.map((a) => ({ name: a.name, amount: formatInr(balances[a.id] ?? 0) })).slice(0, 6), foot: "Latest balance on each account." } }),
    tile({ key: "invest", page: "invest", name: "Investments", value: formatInrCompact(worth.investmentValueInr), tag: "yours", owe: false, sub: `${investments.gainInr >= 0 ? "+" : "−"}${formatInrCompact(Math.abs(investments.gainInr))} on cost${investments.dayChangeInr !== null ? ` · today ${investments.dayChangeInr >= 0 ? "+" : "−"}${formatInr(Math.abs(investments.dayChangeInr))}` : ""}`, colorKey: "indigo",
      card: { title: "Investments", total: formatInr(worth.investmentValueInr), detail: `Cost ${formatInr(investments.costInr)}`, rows: holdings.map((h) => ({ name: h.name, amount: formatInr(h.valueInr) })), foot: investments.unpriced.length > 0 ? `${plural(investments.unpriced.length, "holding")} counted at cost: no price.` : "At the latest saved prices." } }),
    tile({ key: "fixed", page: "fixed", name: "Fixed income", value: formatInrCompact(worth.fixedDepositValueInr + worth.epfValueInr), tag: "yours", owe: false, sub: `${plural(data.fixedDeposits.filter((d) => d.status !== "Closed").length, "deposit")} and EPF`, colorKey: "forest",
      card: { title: "Fixed income", total: formatInr(worth.fixedDepositValueInr + worth.epfValueInr), rows: [{ name: "Fixed deposits", amount: formatInr(worth.fixedDepositValueInr) }, { name: "EPF", amount: formatInr(worth.epfValueInr) }] } }),
    tile({ key: "lent", page: "lent", name: "Lent out", value: formatInrCompact(worth.lentOutInr), tag: "yours", owe: false, sub: plural(lentSummaries.length, "loan"), colorKey: "copper",
      card: { title: "Lent out", total: formatInr(worth.lentOutInr), rows: lentSummaries.map(({ loan, s }) => ({ name: loan.borrowerName, amount: formatInr(s.owedToday) })), foot: "Principal still out plus the interest owed. It can go bad, so it is its own line." } }),
    tile({ key: "cards", page: "cards", name: "Cards", value: `−${formatInrCompact(worth.cardOutstanding)}`, tag: "you owe", owe: true, sub: `${plural(cardSummaries.filter((s) => s.outstandingBalance > 0).length, "bill")}${nextDue ? `, next due ${formatShortDate(nextDue)}` : ""}`, colorKey: "ruby",
      card: { title: "Cards", total: formatInr(worth.cardOutstanding), rows: cardSummaries.filter((s) => s.card.status !== "Closed").map((s) => ({ name: cardName(s.card), amount: formatInr(s.outstandingBalance) })) } }),
    tile({ key: "loans", page: "loans", name: "Loans", value: `−${formatInrCompact(worth.loanOutstanding)}`, tag: "you owe", owe: true, sub: loanSummaries.find((l) => l.nextDueInstallment) ? `EMI ${formatInr(loanSummaries.find((l) => l.nextDueInstallment)!.nextDueInstallment!.totalDue)} due ${formatShortDate(loanSummaries.find((l) => l.nextDueInstallment)!.nextDueInstallment!.dueDate)}` : "no EMI due", colorKey: "teal",
      card: { title: "Loans", total: formatInr(worth.loanOutstanding), rows: loanSummaries.map((l) => ({ name: l.loan.name, amount: formatInr(l.outstandingBalance) })) } }),
    tile({ key: "income", page: "income", name: "Income", value: formatInrCompact(incomeMonthly), per: "a month", tag: "a month", owe: false, sub: `${plural(data.incomeSources.filter((s) => s.status === "Active").length, "source")}`, colorKey: "emerald",
      card: { title: "Income", total: `${formatInr(incomeMonthly)} a month`, rows: data.incomeSources.filter((s) => s.status === "Active").map((s) => ({ name: s.alias || s.name, amount: formatInr(s.expectedAmount) })) } }),
    tile({ key: "subs", page: "subs", name: "Subscriptions", value: formatInrCompact(totalMonthlySubscriptionSpend(data.subscriptions)), per: "a month", tag: "a month", owe: false, sub: `${activeSubs.length} active`, colorKey: "plum",
      card: { title: "Subscriptions", total: `${formatInr(totalMonthlySubscriptionSpend(data.subscriptions))} a month`, rows: [...activeSubs].sort((a, b) => b.amount - a.amount).slice(0, 5).map((s) => ({ name: s.alias || s.name, amount: formatInr(s.amount) })) } }),
    tile({ key: "goals", page: "goals", name: "Goals", value: formatInrCompact(data.goals.contributions.reduce((t, c) => t + (c.amount ?? 0), 0)), per: "set aside", tag: "set aside", owe: false, sub: plural(goals.length, "goal"), colorKey: "rose",
      card: { title: "Goals", total: plural(goals.length, "goal"), rows: goals.slice(0, 6).map((g) => ({ name: g.name, amount: formatInr(g.amount) })), foot: "Each goal's target." } }),
    tile({ key: "ins", page: "ins", name: "Insurance", value: formatInrCompact(cover), per: "cover", tag: "cover", owe: false, sub: plural(views.length, "policy", "policies"), colorKey: "amber",
      card: { title: "Insurance", total: `${formatInr(cover)} of cover`, rows: views.map((v) => ({ name: v.policy.name, amount: formatInr(v.policy.sumInsured) })) } }),
    tile({ key: "due", name: "Due this month", value: formatInrCompact(due), tag: "you owe", owe: true, sub: due <= 0 ? "nothing due" : stillToPay <= 0 ? "all paid" : `${formatInrCompact(stillToPay)} still to pay, ${Math.floor((paid / due) * 100)}% paid`, colorKey: "amber",
      card: { title: "Due this month", total: formatInr(due), detail: "what the month asks of you", rows: [{ name: "Paid so far", amount: formatInr(paid) }, { name: "Still to pay", amount: formatInr(stillToPay) }], foot: "Card bills, EMIs and subscriptions off a card; a subscription on a card is inside its bill." } }),
    // Spent took Still to pay's place (F-EX-01, #395), so the grid stays twelve; what's still to pay is on Due this month.
    tile({ key: "spent", href: "/expenses", name: "Spent", owe: false, colorKey: "coral",
      ...(spent ?? { value: "—", tag: "spent", sub: "couldn't be read", card: { title: "Spent", total: "—", rows: [], foot: "The Expenses figures couldn't be read. Refresh to try again." } }) }),
  ];
  void daysBetween;
  return tiles.map((t) => ({ ...t, flags: t.flags }));
}

export const TILE_NAME = PAGE_NAME;
