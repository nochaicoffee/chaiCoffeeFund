import { balanceOn, isClosed } from "@/lib/aggregate/accounts";
import { cashByBroker, idleShare, totalCash } from "@/lib/aggregate/brokerCash";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { compoundedValue } from "@/lib/aggregate/fixedDeposits";
import { expectedAtMaturity } from "@/lib/aggregate/fixedIncome";
import { totalMonthlyEquivalentIncome } from "@/lib/aggregate/income";
import { isLive, viewPolicies } from "@/lib/aggregate/insurance";
import { summariseLentLoan } from "@/lib/aggregate/lentOut";
import { currentEmi, usualEffect, whatIfPrepayment } from "@/lib/aggregate/loans";
import { monthlyEquivalent } from "@/lib/aggregate/subscriptions";
import { formatDate, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import type { OverviewEvent } from "./events";
import type { OverviewModel } from "./model";

/**
 * Eight things worth knowing about your money (F-OV-05, docs/design/overview.md): each a measure worked out from his own records, with how it is
 * worked out, and never advice. A card with nothing to say (no loans, no lent-out money) is left out, and the count follows.
 */

export type InsightTag = "cash" | "debt" | "risk" | "growth" | "habits";
export const INSIGHT_TAGS: InsightTag[] = ["cash", "debt", "risk", "growth", "habits"];

export type InsightVis =
  | { kind: "bars"; rows: { label: string; value: number; text: string; colorKey: string }[]; foot?: string }
  | { kind: "line"; points: number[]; caption: string; mark: number };

export interface Insight {
  key: string;
  tag: InsightTag;
  /** Worth acting on: a measure that leaves money on the table or a lot riding on one thing. The card is marked, never told what to do. */
  star: boolean;
  title: string;
  body: string;
  vis: InsightVis;
  /** The steps it is worked out in, shown when the card is flipped. */
  how: string[];
  href: string;
  act: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** The money in his spending accounts, day by day for the next `days` days, with each dated cash event applied; and where it is lowest. Brokers' cash is left out. */
export function cashLine(m: OverviewModel, events: OverviewEvent[], days = 30): { points: number[]; start: number; lowest: { value: number; index: number }; outflows: OverviewEvent[]; nextIncome: OverviewEvent | null } | null {
  const { data, today } = m;
  const accounts = data.accounts.filter((a) => a.accountType !== "Brokerage" && !isClosed(a));
  let balance = accounts.reduce((sum, a) => sum + (balanceOn(data.balanceSnapshots, a.id, today)?.balance ?? 0), 0);
  const start = balance;
  const cash = events.filter((e) => e.cash);
  if (accounts.length === 0 || cash.length === 0) return null;
  const points: number[] = [balance];
  for (let d = 1; d <= days; d++) {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
    for (const e of cash) if (e.date === date) balance += e.amount;
    points.push(balance);
  }
  let lowest = { value: points[0], index: 0 };
  points.forEach((v, i) => { if (v < lowest.value) lowest = { value: v, index: i }; });
  return { points, start, lowest, outflows: cash.filter((e) => e.amount < 0), nextIncome: cash.find((e) => e.amount > 0) ?? null };
}

export function insights(m: OverviewModel, events: OverviewEvent[]): Insight[] {
  const { data, today, investments, worth } = m;
  const out: Insight[] = [];
  const activeLoans = data.loans.filter((l) => l.status === "Active" && data.loanInstallments.some((i) => i.loanId === l.id && i.status === "Pending"));

  // 1 · the lowest the bank dips in the next 30 days
  const line = cashLine(m, events);
  if (line && line.outflows.length > 0) {
    const dipDate = new Date(Date.parse(`${today}T00:00:00Z`) + line.lowest.index * 86_400_000).toISOString().slice(0, 10);
    const dips = line.lowest.value < line.start;
    out.push({
      key: "cash-dip", tag: "cash", star: false,
      title: dips ? `Your bank accounts dip to ${formatInrCompact(line.lowest.value)} on ${formatShortDate(dipDate)}` : `Your bank accounts stay above ${formatInrCompact(line.start)} for the next 30 days`,
      body: `${plural(line.outflows.length, "payment")} fall in 30 days${line.nextIncome ? `; the next money in lands ${formatShortDate(line.nextIncome.date)}` : "; no income is expected in that time"}.`,
      vis: { kind: "line", points: line.points, caption: `${formatInrCompact(line.start)} today, lowest ${formatInrCompact(line.lowest.value)}`, mark: line.lowest.index },
      how: ["Start from what your bank accounts hold today (brokers' cash is left out).", "Take off each dated payment and add each expected income, day by day, for 30 days.", "A subscription on a card is inside that card's bill, and a matured deposit lands only when you close it: neither moves the line."],
      href: "/accounts", act: "See Accounts",
    });
  }

  // 2 · a matured deposit against the dearest loan
  const matured = data.fixedDeposits.filter((d) => d.status !== "Closed" && d.maturityDate <= today).sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))[0];
  const dearest = [...activeLoans].sort((a, b) => b.annualInterestRate - a.annualInterestRate)[0];
  if (matured && dearest) {
    const amount = Math.min(expectedAtMaturity(matured).amount, data.loanInstallments.filter((i) => i.loanId === dearest.id && i.status === "Pending").reduce((s, i) => s + i.principalDue, 0));
    const wi = whatIfPrepayment(dearest, data.loanInstallments, amount, usualEffect(dearest), today);
    const interest = (rows: { interestDue: number }[]) => rows.reduce((s, r) => s + r.interestDue, 0);
    const saved = interest(wi.removed) - interest(wi.added);
    const sooner = wi.removed.length - wi.added.length;
    const days = Math.max(0, daysBetween(today, wi.endBefore));
    const earned = compoundedValue(amount, matured.interestRate, days) - amount;
    if (saved > 0) {
      out.push({
        key: "prepay", tag: "debt", star: saved > earned,
        title: `The matured ${matured.name} would save ${formatInrCompact(saved)} if it paid down ${dearest.name}`,
        body: `${sooner > 0 ? `It ends the loan ${plural(sooner, "month")} sooner. ` : ""}Left as a deposit it would earn ${formatInrCompact(earned)} over the same time, so the ${saved >= earned ? "loan" : "deposit"} wins by ${formatInrCompact(Math.abs(saved - earned))}.`,
        vis: { kind: "bars", rows: [{ label: `Interest you still pay on ${dearest.name}`, value: interest(wi.removed), text: formatInrCompact(interest(wi.removed)), colorKey: "copper" }, { label: `If ${formatInrCompact(amount)} goes in now`, value: interest(wi.added), text: formatInrCompact(interest(wi.added)), colorKey: "emerald" }] },
        how: [`${matured.name} has matured and isn't closed: ${formatInr(amount)} would be the amount at maturity.`, `Prepaying it on ${dearest.name} (${dearest.annualInterestRate}%) rebuilds the schedule: interest left falls from ${formatInr(interest(wi.removed))} to ${formatInr(interest(wi.added))}, a saving of ${formatInr(saved)}.`, `Kept as a deposit at ${matured.interestRate}% it grows for the same ${plural(Math.round(days / 30), "month")} to ${formatInr(earned)} of interest.`, "An estimate: the bank's own schedule decides the exact figures."],
        href: "/loans", act: "See Loans",
      });
    }
  }

  // 3 · how much rides on the biggest holding
  const top = investments.holdings[0];
  if (top && investments.holdings.length > 1 && investments.valueInr > 0) {
    const share = top.valueInr / investments.valueInr;
    const employer = top.plans.length > 0;
    out.push({
      key: "concentration", tag: "risk", star: false,
      title: `${pct(share)} of your investments is ${employer ? "one company, the one your shares plan comes from" : top.name}`,
      body: `${top.name} is ${pct(top.valueInr / Math.max(1, worth.netWorth + worth.cardOutstanding + worth.loanOutstanding))} of everything you own. A measure of how much rides on it, not a reason to sell.`,
      vis: { kind: "bars", rows: investments.holdings.slice(0, 4).map((h, i) => ({ label: h.name, value: h.valueInr, text: pct(h.valueInr / investments.valueInr), colorKey: ["indigo", "forest", "amber", "orchid"][i] })) },
      how: ["Each holding's value at the latest saved price (cost where it has no price), over all holdings.", employer ? "It carries RSU or ESPP trades, so your pay and these shares come from the same place." : "Shares of the whole, biggest first."],
      href: "/investments", act: "See Investments",
    });
  }

  // 4 · cash waiting at brokers
  const brokers = cashByBroker(data.accounts, data.balanceSnapshots.map((s) => ({ ...s, native: undefined })), today);
  const idle = totalCash(brokers);
  if (idle > 0) {
    const share = idleShare(idle, investments.valueInr);
    out.push({
      key: "idle-cash", tag: "growth", star: share >= 0.1,
      title: `${formatInrCompact(idle)} is sitting as cash at your brokers`,
      body: `${pct(share)} of what you hold there earns nothing while it waits.`,
      vis: { kind: "bars", rows: [{ label: "Invested", value: investments.valueInr, text: formatInrCompact(investments.valueInr), colorKey: "indigo" }, { label: "Cash", value: idle, text: formatInrCompact(idle), colorKey: "amber" }], foot: brokers.map((b) => `${b.account.name} ${formatInrCompact(b.rupees)}`).join(" · ") },
      how: ["Add each open broker account's latest balance (dollars at today's rate).", "Divide it by the holdings plus that cash.", "Cash is counted once in net worth, as an account; it is outside the holdings' worth and return."],
      href: "/investments", act: "See Investments",
    });
  }

  // 5 · how much of a month is spoken for
  const income = totalMonthlyEquivalentIncome(data.incomeSources);
  if (income > 0) {
    const emis = activeLoans.reduce((s, l) => s + currentEmi(data.loanInstallments.filter((i) => i.loanId === l.id)), 0);
    const premiums = data.insurance.failed ? 0 : viewPolicies(data.insurance.policies, data.insurance.payments, today).filter(isLive).reduce((s, v) => s + (v.latest ? v.latest.payment.amount / (12 * Math.max(1, v.latest.payment.years)) : 0), 0);
    const spoken = emis + premiums;
    if (spoken > 0) {
      out.push({
        key: "spoken-for", tag: "habits", star: false,
        title: `${pct(spoken / income)} of every month's income is spoken for before you spend a rupee`,
        body: `${activeLoans.length > 0 ? `${activeLoans.length === 1 ? "The EMI" : "The EMIs"} and ` : ""}insurance premiums come to ${formatInrCompact(spoken)} of your ${formatInrCompact(income)} a month.`,
        vis: { kind: "bars", rows: [{ label: "EMIs", value: emis, text: formatInrCompact(emis), colorKey: "teal" }, { label: "Premiums, a month", value: premiums, text: formatInrCompact(premiums), colorKey: "amber" }, { label: "The rest", value: Math.max(0, income - spoken), text: formatInrCompact(Math.max(0, income - spoken)), colorKey: "sapphire" }] },
        how: ["Each active loan's current EMI, added up.", "Each live policy's latest premium over the years it bought, as a monthly amount.", "Over your usual monthly income (every active source at its usual amount, as a month)."],
        href: "/loans", act: "See Loans",
      });
    }
  }

  // 6 · how much rides on one borrower
  const lent = data.lent.loans.filter((l) => l.status !== "Repaid").map((l) => ({ l, owed: summariseLentLoan(l, data.lent.repayments, today).owedToday })).filter((x) => x.owed > 0).sort((a, b) => b.owed - a.owed);
  const lentTotal = lent.reduce((s, x) => s + x.owed, 0);
  if (lent.length >= 2) {
    const share = lent[0].owed / lentTotal;
    out.push({
      key: "borrower", tag: "risk", star: share > 0.5,
      title: `${lent[0].l.borrowerName} owes ${pct(share)} of everything you've lent`,
      body: `${formatInrCompact(lent[0].owed)} of the ${formatInrCompact(lentTotal)} out, across ${plural(lent.length, "loan")}.`,
      vis: { kind: "bars", rows: lent.slice(0, 4).map((x, i) => ({ label: x.l.borrowerName, value: x.owed, text: formatInrCompact(x.owed), colorKey: ["copper", "amber", "rose", "plum"][i] })) },
      how: ["Each loan's principal still out plus the interest owed, today.", "The biggest over the total. A measure of how much rides on one person, not a judgement of them."],
      href: "/lent", act: "See Lent out",
    });
  }

  // 7 · what subscriptions cost a year
  const subs = data.subscriptions.filter((s) => s.status === "Active");
  if (subs.length > 0) {
    const monthly = subs.reduce((s, x) => s + monthlyEquivalent(x), 0);
    const sorted = [...subs].sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
    const topThree = sorted.slice(0, 3).reduce((s, x) => s + monthlyEquivalent(x), 0);
    out.push({
      key: "subscriptions", tag: "habits", star: false,
      title: `Subscriptions cost ${formatInrCompact(monthly * 12)} a year`,
      body: `${subs.length > 3 ? `Three of them are ${pct(topThree / monthly)} of it. ` : ""}${formatInrCompact(monthly)} a month across ${plural(subs.length, "subscription")}.`,
      vis: { kind: "bars", rows: sorted.slice(0, 4).map((s, i) => ({ label: s.alias || s.name, value: monthlyEquivalent(s), text: `${formatInrCompact(monthlyEquivalent(s))}/mo`, colorKey: ["plum", "copper", "ruby", "slate"][i] })), foot: subs.length > 4 ? `and ${subs.length - 4} smaller` : undefined },
      how: ["Each active subscription as a monthly amount (a yearly one over twelve).", "Added up, and times twelve.", "Paused and cancelled ones are left out."],
      href: "/subscriptions", act: "See Subscriptions",
    });
  }

  // 8 · when each loan ends
  if (activeLoans.length > 0) {
    const rows = activeLoans.map((l) => {
      const pending = data.loanInstallments.filter((i) => i.loanId === l.id && i.status === "Pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      return { l, end: pending.at(-1)!.dueDate, months: pending.length, interest: pending.reduce((s, i) => s + i.interestDue, 0) };
    });
    const interest = rows.reduce((s, r) => s + r.interest, 0);
    out.push({
      key: "loan-ends", tag: "debt", star: false,
      title: rows.length === 1 ? `${rows[0].l.name} ends ${formatMonthYear(rows[0].end.slice(0, 7))}` : `${rows.map((r) => `${r.l.name} ends ${formatMonthYear(r.end.slice(0, 7))}`).join(", ")}`,
      body: `At today's EMIs you'll pay ${formatInrCompact(interest)} more in interest: ${rows.map((r) => `${formatInrCompact(r.interest)} on ${r.l.name}`).join(" and ")}.`,
      vis: { kind: "bars", rows: rows.map((r, i) => ({ label: r.l.name, value: r.months, text: formatDate(r.end), colorKey: ["teal", "copper", "sky", "plum"][i % 4] })), foot: "months left, from today to the last EMI" },
      how: ["Each active loan's last installment still to pay is where it ends.", "Interest left is the interest part of every installment still to pay, added up.", "An estimate: a prepayment or a rate change moves it."],
      href: "/loans", act: "See Loans",
    });
  }
  return out;
}

/** How many cards there are under each tag, and in all. */
export function insightCounts(list: Insight[]): Record<InsightTag | "all", number> {
  const counts: Record<InsightTag | "all", number> = { all: list.length, cash: 0, debt: 0, risk: 0, growth: 0, habits: 0 };
  for (const i of list) counts[i.tag] += 1;
  return counts;
}
