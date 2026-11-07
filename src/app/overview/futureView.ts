import { totalInInr } from "@/lib/aggregate/investments";
import { loanBalances, type FutureAssumptions, type FutureStart } from "@/lib/aggregate/futureYou";
import type { OverviewModel } from "./model";

/**
 * What Future you starts from (F-OV-05), read from his records, and the defaults for the numbers he can change, each with where it came from.
 * Nothing is guessed: a default that has nothing behind it (no deposits, no EPF) says "assumed" and is the one number the mockup showed.
 */
export interface FutureNote { key: keyof FutureAssumptions; label: string; source: string; assumed: boolean }
export interface FutureView {
  start: FutureStart;
  loanNames: string[];
  defaults: FutureAssumptions;
  notes: FutureNote[];
  /** Today, as "YYYY-MM", the first month of the projection. */
  startMonth: string;
}

const DEFAULTS_WHEN_NONE = { returnPct: 8, depositPct: 7, epfPct: 8.25 };

/**
 * What he adds to investments in a month: his own buys and ESPP purchases over the last twelve months, less what he sold of them (money taken out
 * and put back isn't new money), over twelve. An RSU vest costs him nothing and its sell-to-cover isn't a sale, so neither counts. Never below 0.
 */
export function averageMonthlyAdd(m: OverviewModel): number | null {
  const from = new Date(Date.parse(`${m.today}T00:00:00Z`) - 365 * 86_400_000).toISOString().slice(0, 10);
  const mine = m.data.trades.filter((t) => t.source !== "RSU" && t.tradeDate >= from && t.tradeDate <= m.today);
  if (mine.length === 0) return null;
  const net = mine.reduce((s, t) => s + (t.tradeType === "Buy" ? totalInInr(t) : -totalInInr(t)), 0);
  return Math.max(0, Math.round(net / 12));
}

/** What goes into EPF in a month: the average of his last three contribution months (employee and employer shares together). */
export function averageEpfMonth(m: OverviewModel): number | null {
  const byMonth = new Map<string, number>();
  for (const e of m.data.epf.entries) if (e.kind === "Contribution") byMonth.set(e.wageMonth ?? e.date.slice(0, 7), (byMonth.get(e.wageMonth ?? e.date.slice(0, 7)) ?? 0) + e.employee + e.employer);
  const last = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3).map(([, v]) => v);
  return last.length === 0 ? null : Math.round(last.reduce((s, v) => s + v, 0) / last.length);
}

export function futureView(m: OverviewModel): FutureView {
  const { data, worth, today } = m;
  const active = data.loans.filter((l) => l.status === "Active");
  const balances = active.map((l) => loanBalances(data.loanInstallments.filter((i) => i.loanId === l.id)));
  const keep = active.map((l, i) => ({ l, b: balances[i] })).filter((x) => x.b[0] > 0);
  const add = averageMonthlyAdd(m);
  const epfMonth = averageEpfMonth(m);
  const fds = data.fixedDeposits.filter((d) => d.status !== "Closed");
  const fdPrincipal = fds.reduce((s, d) => s + d.principalAmount, 0);
  const fdRate = fdPrincipal > 0 ? fds.reduce((s, d) => s + d.interestRate * d.principalAmount, 0) / fdPrincipal : null;
  const latestEpfRate = [...data.epf.rates].sort((a, b) => b.financialYear.localeCompare(a.financialYear))[0]?.ratePercent ?? null;
  const defaults: FutureAssumptions = {
    returnPct: DEFAULTS_WHEN_NONE.returnPct,
    addPerMonth: add ?? 0,
    depositPct: fdRate !== null ? Math.round(fdRate * 100) / 100 : DEFAULTS_WHEN_NONE.depositPct,
    epfPct: latestEpfRate ?? DEFAULTS_WHEN_NONE.epfPct,
    epfPerMonth: epfMonth ?? 0,
  };
  const notes: FutureNote[] = [
    { key: "addPerMonth", label: "Added to investments a month", source: add === null ? "no buys in the last twelve months" : "your buys less your sales over the last twelve months, a month on average", assumed: add === null },
    { key: "epfPerMonth", label: "Into EPF a month", source: epfMonth === null ? "no contributions recorded" : "the average of your last three contribution months", assumed: epfMonth === null },
    { key: "depositPct", label: "Deposits earn", source: fdRate === null ? "no deposits held" : "the average rate of your deposits, by size", assumed: fdRate === null },
    { key: "epfPct", label: "EPF earns", source: latestEpfRate === null ? "no declared rate recorded" : "the latest declared rate", assumed: latestEpfRate === null },
  ];
  return {
    start: { bank: worth.bankBalances, investments: worth.investmentValueInr, deposits: worth.fixedDepositValueInr, epf: worth.epfValueInr, lentOut: worth.lentOutInr, cards: worth.cardOutstanding, loanBalances: keep.map((x) => x.b) },
    loanNames: keep.map((x) => x.l.name),
    defaults,
    notes,
    startMonth: today.slice(0, 7),
  };
}
