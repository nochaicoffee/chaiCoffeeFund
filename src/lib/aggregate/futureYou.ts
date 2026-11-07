/**
 * Future you (F-OV-05, docs/design/overview.md): what net worth could be in 1 to 20 years, month by month, if investments earn a chosen yearly
 * return and the amounts added stay as set. Every figure is arithmetic on his own records and on numbers he sets: nothing is predicted and no
 * rate is guessed (the defaults come from his records, and each can be changed). Pure.
 *
 * What it models, and what it leaves out, on purpose:
 * - Investments: grow monthly at the chosen yearly return (as a monthly rate that compounds to it in a year) and take the amount added each month.
 * - Deposits: grow at one yearly rate, compounding monthly (a matured deposit is taken as rolled over).
 * - EPF: grows at its rate and takes its monthly contribution.
 * - Loans: paid by their own EMIs only, so each balance follows its stored schedule and reaches exactly zero at its last installment.
 * - Bank accounts, money lent out and card bills stay as they are today: what he saves beyond what he adds to investments isn't modelled.
 */

export interface FutureStart {
  bank: number;
  investments: number;
  deposits: number;
  epf: number;
  lentOut: number;
  cards: number;
  /** For each loan, what is left to repay after 0, 1, 2 … installments (from its stored schedule); the last is 0. */
  loanBalances: number[][];
}

export interface FutureAssumptions {
  /** The yearly return on investments, in percent. */
  returnPct: number;
  /** Added to investments each month, in rupees. */
  addPerMonth: number;
  /** Yearly rate on deposits, in percent. */
  depositPct: number;
  /** Yearly rate on EPF, in percent. */
  epfPct: number;
  /** Put into EPF each month, in rupees (employee and employer). */
  epfPerMonth: number;
}

export interface FuturePoint {
  /** Months from today. */
  month: number;
  investments: number;
  deposits: number;
  epf: number;
  loans: number;
  owed: number;
  net: number;
}

/** A yearly rate as the monthly rate that compounds to it over twelve months. */
export const monthlyRate = (yearlyPct: number): number => (1 + yearlyPct / 100) ** (1 / 12) - 1;

/** What is left to repay after each installment, from a loan's stored installments (oldest first by number): index 0 is what is owed now, the last is 0. */
export function loanBalances(installments: { status: string; principalDue: number; installmentNumber: number }[]): number[] {
  const pending = installments.filter((i) => i.status === "Pending").sort((a, b) => a.installmentNumber - b.installmentNumber);
  let left = pending.reduce((s, i) => s + i.principalDue, 0);
  const out = [left];
  for (const i of pending) {
    left = Math.max(0, Math.round((left - i.principalDue) * 100) / 100);
    out.push(left);
  }
  out[out.length - 1] = 0;
  return out;
}

export function projectFuture(start: FutureStart, a: FutureAssumptions, months = 240): FuturePoint[] {
  const ri = monthlyRate(a.returnPct);
  const rd = monthlyRate(a.depositPct);
  const re = monthlyRate(a.epfPct);
  const points: FuturePoint[] = [];
  let investments = start.investments;
  let deposits = start.deposits;
  let epf = start.epf;
  for (let month = 0; month <= months; month++) {
    if (month > 0) {
      investments = investments * (1 + ri) + a.addPerMonth;
      deposits *= 1 + rd;
      epf = epf * (1 + re) + a.epfPerMonth;
    }
    const loans = start.loanBalances.reduce((s, b) => s + (b[Math.min(month, b.length - 1)] ?? 0), 0);
    const owed = loans + start.cards;
    points.push({ month, investments, deposits, epf, loans, owed, net: start.bank + investments + deposits + epf + start.lentOut - owed });
  }
  return points;
}

export interface FutureMilestone {
  month: number;
  label: string;
}

/** The first month each mark is passed, and each loan's last month: the flags on the chart, soonest first. `loanNames` is in the same order as the start's loan balances. */
export function futureMilestones(points: FuturePoint[], start: Pick<FutureStart, "loanBalances">, loanNames: string[], marks: { value: number; label: string }[] = NET_MARKS): FutureMilestone[] {
  const out: FutureMilestone[] = [];
  start.loanBalances.forEach((b, i) => {
    const month = b.length - 1;
    if (month > 0 && month <= points.length - 1) out.push({ month, label: `${loanNames[i] ?? "Loan"} cleared` });
  });
  for (const mark of marks) {
    if (points[0].net >= mark.value) continue;
    const hit = points.find((p) => p.net >= mark.value);
    if (hit) out.push({ month: hit.month, label: `Net worth passes ${mark.label}` });
  }
  const invMark = 10_000_000;
  if (points[0].investments < invMark) {
    const hit = points.find((p) => p.investments >= invMark);
    if (hit) out.push({ month: hit.month, label: "Investments pass ₹1 Cr" });
  }
  return out.sort((a, b) => a.month - b.month);
}

export const NET_MARKS = [
  { value: 5_000_000, label: "₹50L" },
  { value: 10_000_000, label: "₹1 Cr" },
  { value: 20_000_000, label: "₹2 Cr" },
  { value: 50_000_000, label: "₹5 Cr" },
];

/** What a horizon in years reads off the projection, against today and against investments not growing at all (the amount added still goes in). */
export function futureAt(points: FuturePoint[], start: FutureStart, a: FutureAssumptions, years: number): { point: FuturePoint; change: number; fromGrowth: number; fromEverythingElse: number } {
  const month = Math.min(years * 12, points.length - 1);
  const point = points[month];
  const still = projectFuture(start, { ...a, returnPct: 0 }, month).at(-1)!;
  return { point, change: point.net - points[0].net, fromGrowth: point.net - still.net, fromEverythingElse: still.net - points[0].net };
}
