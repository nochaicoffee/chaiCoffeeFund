import type { SentencePart } from "@/app/cards/summarySentence";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { lentClock, type LentClock } from "@/lib/aggregate/lentClock";
import { annualRatePercent, lentLoanColor } from "@/lib/aggregate/lentOut";
import { lentPromises, type LentPromises } from "@/lib/aggregate/lentPromises";
import { whoOwesWhat, type WhoOwesWhat } from "@/lib/aggregate/lentWho";
import { cardColorKey } from "@/lib/format/colors";
import { formatDayDate, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { IncomeEntry, IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

/**
 * What the Lent page shows (docs/design/lent-out.md, L3 Who owes what + the interest clock), as plain, already-formatted data: the
 * greeting's sentence and the cards its figures point at, and the attention strip. The numbers come from lib/aggregate (lentOut,
 * lentWho, lentClock, lentPromises); nothing here works anything out that isn't shown.
 */

export interface LentData {
  loans: LentLoan[];
  repayments: LentRepayment[];
  sources: IncomeSource[];
  entries: IncomeEntry[];
}

/** Everything the views read, worked out once. */
export interface LentModel {
  today: string;
  data: LentData;
  /** One result per Paid-out loan, by the loan's id. */
  promises: Record<string, LentPromises>;
  who: WhoOwesWhat;
  clock: LentClock;
}

/** An Accruing loan with nothing paid back that has been out this long gets an attention line (a measure, not a reminder to chase). */
export const LONG_OUT_DAYS = 365;

export function lentModel(data: LentData, today: string): LentModel {
  const promises: Record<string, LentPromises> = {};
  for (const loan of data.loans) {
    if (loan.interestMode === "Paid-out") promises[loan.id] = lentPromises(loan, data.sources.find((s) => s.id === loan.incomeSourceId), data.entries, today);
  }
  return { today, data, promises, who: whoOwesWhat(data.loans, data.repayments, today), clock: lentClock(data.loans, data.repayments, promises, today) };
}

const rupees = (n: number) => formatInr(Math.round(n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const colorOf = (loan: LentLoan) => cardColorKey(lentLoanColor(loan));
const ratePhrase = (loan: LentLoan) => `${Number(annualRatePercent(loan).toFixed(1))}%`;

/** The soonest payout still to come across the payout loans. */
function nextPayout(m: LentModel): { loan: LentLoan; date: string; amount: number; inDays: number } | undefined {
  let best: { loan: LentLoan; date: string; amount: number; inDays: number } | undefined;
  for (const loan of m.data.loans) {
    const next = m.promises[loan.id]?.next;
    if (next && (!best || next.date < best.date)) best = { loan, ...next };
  }
  return best;
}

export type LentPoint = "total" | "loans" | "perDay" | "pile" | "notHere" | "next";

export function summarySentence(m: LentModel): SentencePart[] {
  const { who, clock } = m;
  if (m.data.loans.length === 0) return [{ text: "Nothing lent yet. Add a loan, and this page shows who owes you what, what it earns a day and which payouts have arrived." }];
  if (who.blocks.length === 0) return [{ text: `Everything you lent has come back: ${plural(who.repaid.length, "loan", "loans")} repaid, nothing is out.` }];
  const parts: SentencePart[] = [
    { text: formatInr(Math.round(who.total)), strong: true, point: "total" },
    { text: " is out with " },
    { text: plural(who.blocks.length, "loan", "loans"), strong: true, point: "loans" },
    { text: ", earning about " },
    { text: `${rupees(clock.pace.day)} a day`, strong: true, point: "perDay" },
    { text: ". " },
  ];
  const accruing = who.blocks.filter((b) => b.loan.interestMode === "Accruing");
  const pile = clock.pot.owed;
  const notHere = clock.lumps.notHere;
  if (pile > 0) {
    parts.push({ text: rupees(pile), strong: true, point: "pile" }, { text: " of it is interest piling up on " });
    parts.push({ text: accruing.length === 1 ? `${accruing[0].loan.borrowerName}'s ${ratePhrase(accruing[0].loan)} loan` : `${accruing.length} loans whose interest builds up` });
    parts.push({ text: notHere > 0 ? ", and " : ". " });
  }
  if (notHere > 0) {
    parts.push({ text: rupees(notHere), strong: true, point: "notHere" }, { text: " of payouts hasn't reached you. " });
  }
  const next = nextPayout(m);
  if (next) parts.push({ text: "The next one is " }, { text: rupees(next.amount), strong: true, point: "next" }, { text: ` on ${formatDayDate(next.date)}.` });
  return parts;
}

export interface GreetingCard {
  title: string;
  total: string;
  rows: GreetingRowData[];
  note?: string;
}
export type LentGreetingCards = Partial<Record<LentPoint, GreetingCard>>;

export function greetingView(m: LentModel): LentGreetingCards {
  const { who, clock } = m;
  const cards: LentGreetingCards = {};
  if (who.blocks.length === 0) return cards;
  const principal = who.blocks.reduce((t, b) => t + b.summary.principalOutstanding, 0);

  cards.total = {
    title: "What is out today",
    total: formatInr(Math.round(who.total)),
    rows: who.blocks.map((b) => ({
      key: b.loan.id,
      name: b.loan.borrowerName,
      colorKey: colorOf(b.loan),
      amount: rupees(b.owedToday),
      note: b.loan.interestMode === "Accruing" ? "principal and its interest" : "principal; the interest comes as income",
      fraction: b.share,
    })),
    note: `${rupees(principal)} is principal` + (clock.pot.owed > 0 ? ` and ${rupees(clock.pot.owed)} is interest still owed.` : "."),
  };

  cards.loans = {
    title: "Your loans",
    total: plural(who.blocks.length, "loan", "loans"),
    rows: who.blocks.map((b) => ({
      key: b.loan.id,
      name: b.loan.borrowerName,
      colorKey: colorOf(b.loan),
      amount: rupees(b.loan.principalAmount),
      note: `lent ${formatShortDate(b.loan.startDate)}, ${b.loan.startDate.slice(0, 4)} · ${b.loan.interestMode === "Accruing" ? `${ratePhrase(b.loan)} simple` : `${rupees(b.loan.payoutAmount ?? 0)} ${b.loan.payoutFrequency === "Monthly" ? "a month" : b.loan.payoutFrequency === "Quarterly" ? "a quarter" : "a year"}`}`,
    })),
    note: who.repaid.length > 0 ? `${plural(who.repaid.length, "more is", "more are")} repaid and out of the count.` : undefined,
  };

  if (clock.pace.day > 0) {
    cards.perDay = {
      title: "What it earns a day",
      total: rupees(clock.pace.day),
      rows: clock.loans.map((c) => ({ key: c.loan.id, name: c.loan.borrowerName, colorKey: colorOf(c.loan), amount: rupees(c.perDay), note: `${ratePhrase(c.loan)} a year`, fraction: c.share })),
      note: `A month is about ${rupees(clock.pace.month)} and a year ${rupees(clock.pace.year)} at today's pace.`,
    };
  }

  if (clock.pot.owed > 0) {
    cards.pile = {
      title: "Interest piling up",
      total: rupees(clock.pot.owed),
      rows: who.blocks
        .filter((b) => b.loan.interestMode === "Accruing" && b.summary.interestOwed > 0)
        .map((b) => ({ key: b.loan.id, name: b.loan.borrowerName, colorKey: colorOf(b.loan), amount: rupees(b.summary.interestOwed), note: `${rupees(b.perDay)} a day${b.summary.interestPaid > 0 ? `, ${rupees(b.summary.interestPaid)} already paid` : ", none of it paid"}` })),
      note: "Simple interest, never compounded: the principal still out × the rate × the days ÷ 365.",
    };
  }

  const missed = who.blocks.flatMap((b) => (m.promises[b.loan.id]?.promises ?? []).filter((p) => p.verdict === "Overdue" || p.verdict === "Missing").map((p) => ({ b, p })));
  if (clock.lumps.notHere > 0) {
    cards.notHere = {
      title: "Payouts not here",
      total: rupees(clock.lumps.notHere),
      rows: missed.map(({ b, p }) => ({
        key: `${b.loan.id}-${p.date}`,
        name: b.loan.borrowerName,
        colorKey: colorOf(b.loan),
        amount: rupees(p.amount),
        note: p.verdict === "Missing" ? `due ${formatShortDate(p.date)}, never came` : `due ${formatShortDate(p.date)}, ${plural(p.daysAfter ?? 0, "day", "days")} over`,
        warn: p.verdict === "Missing",
      })),
      note: "Shown beside what is owed, never added to it: a payout that didn't come is income that didn't arrive, not a debt.",
    };
  }

  const upcoming = who.blocks.flatMap((b) => (m.promises[b.loan.id]?.next ? [{ b, next: m.promises[b.loan.id].next! }] : [])).sort((a, c) => a.next.date.localeCompare(c.next.date));
  if (upcoming.length > 0) {
    cards.next = {
      title: "Next payouts",
      total: rupees(upcoming[0].next.amount),
      rows: upcoming.map(({ b, next }) => ({ key: b.loan.id, name: b.loan.borrowerName, colorKey: colorOf(b.loan), amount: rupees(next.amount), note: `${formatDayDate(next.date)} · in ${plural(next.inDays, "day", "days")}` })),
    };
  }
  return cards;
}

export type AttentionKind = "payout" | "long-out" | "unlinked";
export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  /** late is red (a payout that never came), the rest amber. */
  tone: "warn" | "late";
  title: string;
  text: string;
  /** A link the strip offers, for the items that have somewhere to go. */
  href?: string;
  action?: string;
}

/** What needs attention: payouts not here (each loan once, the worst first), a loan out a long time with nothing back, and a payout loan nothing is tracking. */
export function attentionView(m: LentModel): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const b of m.who.blocks) {
    const loan = b.loan;
    const p = m.promises[loan.id];
    if (loan.interestMode === "Paid-out" && p && !p.linked) {
      const noSchedule = m.data.sources.some((s) => s.id === loan.incomeSourceId && !s.scheduleDate);
      items.push({
        id: `unlinked-${loan.id}`,
        kind: "unlinked",
        tone: "warn",
        title: noSchedule ? `${loan.borrowerName}'s income source has no schedule date.` : `${loan.borrowerName} isn't linked to an income source.`,
        text: noSchedule ? "Its payouts aren't tracked until it has one. Set the next payout's date on the source in Income." : "Its payouts aren't tracked, so nothing can say whether one is late. Add an income source for it in Income.",
        href: "/income",
        action: "Open Income",
      });
    }
    if (p?.linked && p.notHere > 0) {
      const open = p.promises.filter((x) => x.verdict === "Overdue" || x.verdict === "Missing");
      const first = open[0];
      const missing = open.filter((x) => x.verdict === "Missing");
      const overdue = open.filter((x) => x.verdict === "Overdue");
      const lead = overdue[0] ?? first;
      const sum = (list: typeof open) => list.reduce((t, x) => t + x.amount, 0);
      const title =
        overdue.length > 0
          ? `${rupees(lead.amount)} from ${loan.borrowerName} was due ${formatDayDate(lead.date)} and hasn't arrived (${plural(lead.daysAfter ?? 0, "day", "days")}).`
          : missing.length === 1
            ? `${rupees(first.amount)} from ${loan.borrowerName} never came (due ${formatDayDate(first.date)}).`
            : `${rupees(sum(missing))} from ${loan.borrowerName} never came (${missing.length} payouts, the first due ${formatDayDate(first.date)}).`;
      // The missing ones the title doesn't already name: each by its day when there are few, else together.
      const rest =
        missing.length === 0 || overdue.length === 0
          ? ""
          : missing.length <= 3
            ? `${missing.map((x) => `${formatShortDate(x.date)}'s ${rupees(x.amount)}`).join(", ")} never did. `
            : `${missing.length} earlier payouts, ${rupees(sum(missing))}, never came. `;
      items.push({ id: `payout-${loan.id}`, kind: "payout", tone: missing.length > 0 ? "late" : "warn", title, text: `${rest}Match the bank credit when it lands, or leave it open.`, href: "/income", action: "Open Income" });
    }
    if (loan.interestMode === "Accruing" && b.summary.interestPaid === 0 && b.summary.principalOutstanding === loan.principalAmount) {
      const days = daysBetween(loan.startDate, m.today);
      if (days > LONG_OUT_DAYS) {
        items.push({ id: `long-${loan.id}`, kind: "long-out", tone: "warn", title: `${loan.borrowerName}'s ${rupees(loan.principalAmount)} is ${days} days out with nothing paid back.`, text: `${rupees(b.summary.interestOwed)} of interest is owed, growing ${rupees(b.perDay)} a day. A measure, not a reminder to chase.` });
      }
    }
  }
  const rank = { late: 0, warn: 1 } as const;
  return items.sort((a, c) => rank[a.tone] - rank[c.tone]);
}

/**
 * What the Overview borrows from this page's attention items: a payout that is late or never came, and a loan out a long time with nothing back.
 * A payout loan nothing tracks is left on this page: it is a gap in the setup, not something that happened.
 */
export function overviewAttention(m: LentModel): { label: string; detail: string }[] {
  return attentionView(m)
    .filter((i) => i.kind === "payout" || i.kind === "long-out")
    .map((i) => ({ label: i.title, detail: i.text }));
}
