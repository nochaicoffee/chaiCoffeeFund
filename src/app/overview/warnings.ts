import { daysBetween } from "@/lib/aggregate/cardSpend";
import { cardName } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { formatShortDate } from "@/lib/format/date";
import type { Card, Statement } from "@/lib/sheets/types";

/**
 * Keep in mind (F-OV-05): every warning every page raises, in one list. Each page already decides what needs attention (its own `attentionView`);
 * here those items are put in one shape, tagged with their page, and ranked. Nothing is judged anew, so a warning here is the one its page shows.
 */

export type WarningPage = "accounts" | "invest" | "fixed" | "lent" | "cards" | "loans" | "income" | "subs" | "ins" | "goals";
/** Act now (red), soon or off (amber), worth knowing (info). */
export type WarningTone = "red" | "amber" | "info";

export interface OverviewWarning {
  /** Stable across renders: the page, then what it is about. */
  id: string;
  tone: WarningTone;
  page: WarningPage;
  text: string;
  detail: string;
  /** The button's words, and where it goes. */
  act: string;
  href: string;
  /** The day it belongs to, when it has one (a due date); null when it is about now. */
  date: string | null;
  /** What it is about, so a dated event can find it: "installment:<id>", "statement:<id>", "policy:<id>". */
  ref?: string;
}

export const PAGE_HREF: Record<WarningPage, string> = {
  accounts: "/accounts", invest: "/investments", fixed: "/fixed-income", lent: "/lent", cards: "/cards", loans: "/loans", income: "/income", subs: "/subscriptions", ins: "/insurance", goals: "/goals",
};
export const PAGE_NAME: Record<WarningPage, string> = {
  accounts: "Accounts", invest: "Investments", fixed: "Fixed income", lent: "Lent out", cards: "Cards", loans: "Loans", income: "Income", subs: "Subscriptions", ins: "Insurance", goals: "Goals",
};
const TONE_RANK: Record<WarningTone, number> = { red: 0, amber: 1, info: 2 };

// ---------- What each page hands over (only the fields used; each page's own AttentionItem fits) ----------

export interface LoansItem { installmentId: string; loanId: string; name: string; amount: string; text: string; overdue: boolean; dueDate?: string }
export interface IncomeItem { sourceId: string; name: string; text: string; amount: string }
export interface LentItem { id: string; kind: "payout" | "long-out" | "unlinked"; tone: "warn" | "late"; title: string; text: string; href?: string; action?: string }
export interface FixedItem { id: string; kind: string; tone: "warn" | "late" | "ok"; title: string; text: string; depositId?: string }
export interface InsuranceItem { policyId: string; name: string; text: string; tone: "lapsed" | "soon"; renewsOn?: string }
export interface GoalsItem { id: string; tone: "warning" | "negative"; label: string; detail: string }
export interface AccountsItem { id: string; accountId: string; accountName: string; dateText: string; recordedText: string; statementText: string; differenceText: string }

const clause = (s: string) => s.trim();

export function fromLoans(items: LoansItem[], today: string): OverviewWarning[] {
  return items.map((i) => ({
    id: `loans:${i.installmentId}`,
    tone: i.overdue || i.dueDate === today || /today/.test(i.text) ? "red" : "amber",
    page: "loans",
    text: `${i.name} installment`,
    detail: `${i.amount} ${clause(i.text)}`,
    act: "Mark paid",
    href: PAGE_HREF.loans,
    date: i.dueDate ?? null,
    ref: `installment:${i.installmentId}`,
  }));
}
export function fromIncome(items: IncomeItem[]): OverviewWarning[] {
  return items.map((i) => ({ id: `income:${i.sourceId}`, tone: "amber", page: "income", text: `${i.name} not received`, detail: `${i.amount} ${clause(i.text)}`, act: "Match a credit", href: PAGE_HREF.income, date: null }));
}
export function fromLent(items: LentItem[]): OverviewWarning[] {
  // A payout loan nothing tracks is a gap in the setup, not something that happened: it stays on the Lent page (as the old Overview did).
  return items
    .filter((i) => i.kind !== "unlinked")
    .map((i) => ({ id: `lent:${i.id}`, tone: i.tone === "late" ? "red" : "amber", page: "lent", text: i.title, detail: i.text, act: i.action ?? "Open Lent out", href: i.href ?? PAGE_HREF.lent, date: null }));
}
export function fromFixed(items: FixedItem[]): OverviewWarning[] {
  // What the Overview borrows from the Fixed Income page (its own overviewAttention): a late EPF credit and a deposit that has matured and isn't closed.
  // Its estimates ("interest isn't credited yet"), set-up notes and the credited good news stay on that page.
  return items
    .filter((i) => i.kind === "late" || i.kind === "due")
    .map((i) => ({ id: `fixed:${i.id}`, tone: i.tone === "late" ? "red" : "amber", page: "fixed", text: i.title, detail: i.text, act: i.kind === "due" ? "Close it" : "Open Fixed income", href: PAGE_HREF.fixed, date: null }));
}
export function fromInsurance(items: InsuranceItem[]): OverviewWarning[] {
  return items.map((i) => ({ id: `ins:${i.policyId}`, tone: i.tone === "lapsed" ? "red" : "amber", page: "ins", text: i.name, detail: i.text, act: i.tone === "lapsed" ? "Renew" : "See renewal", href: PAGE_HREF.ins, date: i.renewsOn ?? null, ref: `policy:${i.policyId}` }));
}
export function fromGoals(items: GoalsItem[]): OverviewWarning[] {
  return items.map((i) => ({ id: `goals:${i.id}:${i.label}`, tone: i.tone === "negative" ? "red" : "amber", page: "goals", text: i.label, detail: i.detail, act: "See goal", href: PAGE_HREF.goals, date: null }));
}
export function fromAccounts(items: AccountsItem[]): OverviewWarning[] {
  return items.map((i) => ({
    id: `accounts:${i.id}`, tone: "amber", page: "accounts", text: `${i.accountName}: the statement and the Sheet differ`,
    detail: `${i.dateText}: Sheet ${i.recordedText}, statement ${i.statementText} (${i.differenceText}).`, act: "Review", href: PAGE_HREF.accounts, date: null,
  }));
}

/**
 * Card statements still to pay, as the old Overview listed them but ranked: past its due day is red, due within a week amber, later just worth knowing.
 * A closed card's unpaid bill is still owed (net worth counts it, PRD §8), so it is listed too.
 * (The Cards page keeps its own due-date strip; the Overview is the one place a far-off statement shows.)
 */
export function fromCards(cards: Card[], statements: Statement[], today: string): OverviewWarning[] {
  const names = new Map(cards.map((c) => [c.id, c]));
  return statements
    .filter((s) => s.status === "Pending" && names.has(s.cardId) && s.totalAmountDue - (s.amountPaid ?? 0) > 0)
    .map((s) => {
      const left = s.totalAmountDue - (s.amountPaid ?? 0);
      const days = daysBetween(today, s.dueDate);
      const tone: WarningTone = days < 0 ? "red" : days <= 7 ? "amber" : "info";
      const when = days < 0 ? `${-days} ${-days === 1 ? "day" : "days"} overdue` : days === 0 ? "due today" : `due ${formatShortDate(s.dueDate)}`;
      return { id: `cards:${s.id}`, tone, page: "cards" as const, text: `${cardName(names.get(s.cardId)!)} statement`, detail: `${formatInr(left)} ${when}`, act: "Mark paid", href: PAGE_HREF.cards, date: s.dueDate, ref: `statement:${s.id}` };
    });
}

/** A source that couldn't be read is a warning of its own: net worth is leaving something out, and it says so on the page it belongs to. */
export interface SourceProblems { epf: boolean; lent: boolean; goals: boolean; insurance: boolean; prices: boolean; unpricedAccounts: { name: string; reason?: string }[] }
export function fromProblems(p: SourceProblems): OverviewWarning[] {
  const out: OverviewWarning[] = [];
  const add = (id: string, page: WarningPage, text: string, detail: string) => out.push({ id: `problem:${id}`, tone: "amber", page, text, detail, act: "Refresh", href: PAGE_HREF[page], date: null });
  if (p.epf) add("epf", "fixed", "EPF isn't counted", "The EPF tabs couldn't be read, so net worth leaves EPF out until they can.");
  if (p.lent) add("lent", "lent", "Money lent out isn't counted", "The LentLoans and LentRepayments tabs couldn't be read, so net worth leaves what people owe you out until they can.");
  if (p.goals) add("goals", "goals", "Goals couldn't be read", "Their warnings are missing here until the Goals tabs can be read.");
  if (p.insurance) add("ins", "ins", "Insurance couldn't be read", "Premiums due are missing here until the Insurance tabs can be read.");
  if (p.prices) add("prices", "invest", "Prices couldn't be read", "Every holding is counted at what it cost until the saved prices can be read; your trades are unchanged.");
  for (const a of p.unpricedAccounts) add(`unpriced-${a.name}`, "accounts", `${a.name} isn't counted`, `Its dollars can't be turned into rupees${a.reason ? `: ${a.reason}` : ""}. Net worth leaves it out until the rate is back.`);
  return out;
}

/** Everything in one list: act now first, then soon, then worth knowing; within a tone the day it belongs to (soonest first), items with no day after those that have one. */
export function collectWarnings(...lists: OverviewWarning[][]): OverviewWarning[] {
  return lists
    .flat()
    .map((w, index) => ({ w, index }))
    .sort((a, b) => TONE_RANK[a.w.tone] - TONE_RANK[b.w.tone] || (a.w.date === null ? 1 : 0) - (b.w.date === null ? 1 : 0) || (a.w.date && b.w.date ? a.w.date.localeCompare(b.w.date) : 0) || a.index - b.index)
    .map(({ w }) => w);
}

/** How many of each tone, and per page, for the tiles' flags and the greeting. */
export function warningCounts(list: OverviewWarning[]): { red: number; amber: number; info: number; total: number; byPage: Partial<Record<WarningPage, OverviewWarning[]>> } {
  const byPage: Partial<Record<WarningPage, OverviewWarning[]>> = {};
  for (const w of list) (byPage[w.page] ??= []).push(w);
  return { red: list.filter((w) => w.tone === "red").length, amber: list.filter((w) => w.tone === "amber").length, info: list.filter((w) => w.tone === "info").length, total: list.length, byPage };
}
