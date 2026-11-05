// The Lent out data: his three real loans, the maths of src/lib/aggregate/lentOut.ts ported line for line (actual days / 365, simple interest, never compounded),
// and the SAMPLE payments (made up: the real data has no income entries yet). "Today" is Fri Nov 6, 2026.
import { TODAY, addDays, addMonthsUTC, daysBetween } from "./lib.mjs";
export { TODAY, daysBetween };

const PER_YEAR = { Monthly: 12, Quarterly: 4, Yearly: 1 };

// ---------- His real loans (LentLoan rows) ----------
export const LOANS = [
  { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active", color: "copper", tag: "F" },
  { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active", color: "teal", tag: "F" },
  { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active", color: "violet", tag: "F" },
];
export const REPAYMENTS = []; // nothing has come back yet (LentRepayments is empty)

// ---------- lentOut.ts, ported ----------
export const annualRatePercent = (l) => (l.interestMode === "Accruing" ? l.interestRate ?? 0 : ((l.payoutAmount * PER_YEAR[l.payoutFrequency]) / l.principalAmount) * 100);
const repaymentsOf = (l, reps, asOf) => reps.filter((r) => r.lentLoanId === l.id && r.date <= asOf);
const accrualEnd = (l, asOf) => (l.status === "Repaid" && l.closedDate && l.closedDate < asOf ? l.closedDate : asOf);
export function principalOutstanding(l, reps, asOf) {
  if (asOf < l.startDate) return 0;
  if (l.status === "Repaid" && (!l.closedDate || asOf >= l.closedDate)) return 0;
  const paid = repaymentsOf(l, reps, asOf).filter((r) => r.kind === "Principal").reduce((t, r) => t + r.amount, 0);
  return Math.max(0, l.principalAmount - paid);
}
export function interestAccrued(l, reps, asOf) {
  if (l.interestMode !== "Accruing") return 0;
  const end = accrualEnd(l, asOf);
  if (end <= l.startDate) return 0;
  const rate = (l.interestRate ?? 0) / 100;
  const pp = repaymentsOf(l, reps, end).filter((r) => r.kind === "Principal").sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let out = l.principalAmount, from = l.startDate, interest = 0;
  for (const p of pp) { const to = p.date < l.startDate ? l.startDate : p.date; interest += (out * rate * daysBetween(from, to)) / 365; out = Math.max(0, out - p.amount); from = to; }
  return interest + (out * rate * daysBetween(from, end)) / 365;
}
export const interestPaid = (l, reps, asOf) => repaymentsOf(l, reps, asOf).filter((r) => r.kind === "Interest").reduce((t, r) => t + r.amount, 0);
export function summarise(l, reps, asOf) {
  const outstanding = principalOutstanding(l, reps, asOf), accrued = interestAccrued(l, reps, asOf), paid = interestPaid(l, reps, asOf);
  const closed = l.status === "Repaid" && (!l.closedDate || asOf >= l.closedDate);
  const owed = closed ? 0 : Math.max(0, accrued - paid);
  return { loan: l, rate: annualRatePercent(l), principalOutstanding: outstanding, interestAccrued: accrued, interestPaid: paid, interestOwed: owed, owedToday: outstanding + owed };
}
export const totalLentOut = (loans, reps, asOf) => loans.reduce((t, l) => t + summarise(l, reps, asOf).owedToday, 0);

// ---------- A payout loan's promised dates ----------
// Assumption (open question for him): the first payout falls one period after the day the money was lent, then every period. Monthly = same day each month.
const STEP = { Monthly: 1, Quarterly: 3, Yearly: 12 };
export function dueDates(l, upTo) {
  if (l.interestMode !== "Paid-out") return [];
  const out = [];
  for (let i = 1; ; i++) { const d = addMonthsUTC(l.startDate, STEP[l.payoutFrequency] * i); if (d > upTo) break; out.push(d); }
  return out;
}
export const nextDue = (l, asOf) => (l.interestMode === "Paid-out" ? addMonthsUTC(l.startDate, STEP[l.payoutFrequency] * (dueDates(l, asOf).length + 1)) : null);

// ---------- SAMPLE: what arrived (made up; the real data has no income entries yet) ----------
// Each payout loan gets an income source; a bank-statement credit matched to it is a payment. Date = the day it arrived, null = nothing arrived.
const ARRIVED = {
  b: { "2025-12-01": "2025-12-01", "2026-01-01": "2026-01-02", "2026-02-01": null, "2026-03-01": "2026-03-10", "2026-04-01": "2026-04-01", "2026-05-01": "2026-05-02", "2026-06-01": "2026-06-01", "2026-07-01": "2026-07-01", "2026-08-01": "2026-08-03", "2026-09-01": "2026-09-01", "2026-10-01": "2026-10-01", "2026-11-01": null },
  c: { "2026-04-01": "2026-04-01", "2026-07-01": "2026-07-04", "2026-10-01": "2026-10-01" },
};
const GRACE = 3; // days after the due date still counted on time
/** One promised payout: its state today. ok = arrived within the grace, late-paid = arrived after it, late = not here yet and under 14 days over, missing = over 14 days over. */
export function payouts(l, asOf = TODAY, arrived = ARRIVED) {
  return dueDates(l, asOf).map((due) => {
    const got = arrived[l.id]?.[due] ?? null;
    const gone = daysBetween(due, asOf);
    const lateBy = got ? daysBetween(due, got) : gone;
    const state = got ? (lateBy > GRACE ? "late-paid" : "ok") : gone > 14 ? "missing" : "late";
    return { loan: l, due, got, amount: l.payoutAmount, state, lateBy: got ? lateBy : gone };
  });
}
export const PAYOUTS = Object.fromEntries(LOANS.filter((l) => l.interestMode === "Paid-out").map((l) => [l.id, payouts(l)]));
export const ALL_PAYOUTS = Object.values(PAYOUTS).flat().sort((a, b) => a.due.localeCompare(b.due));
export const isReceived = (p) => p.state === "ok" || p.state === "late-paid";
export const expectedSoFar = (l) => (PAYOUTS[l.id] ?? []).reduce((t, p) => t + p.amount, 0);
export const receivedSoFar = (l) => (PAYOUTS[l.id] ?? []).filter(isReceived).reduce((t, p) => t + p.amount, 0);
export const notReceived = (l) => expectedSoFar(l) - receivedSoFar(l);

// ---------- Every figure a board reads ----------
export const SUMS = LOANS.map((l) => summarise(l, REPAYMENTS, TODAY));
export const S = Object.fromEntries(SUMS.map((s) => [s.loan.id, s]));
export const TOTAL = totalLentOut(LOANS, REPAYMENTS, TODAY);
export const PRINCIPAL_OUT = SUMS.reduce((t, s) => t + s.principalOutstanding, 0);
export const perDay = (l) => (principalOutstanding(l, REPAYMENTS, TODAY) * annualRatePercent(l)) / 100 / 365;
export const PER_DAY = LOANS.reduce((t, l) => t + perDay(l), 0);
export const PER_YEAR_INT = PER_DAY * 365;
export const A = LOANS[0], B = LOANS[1], C = LOANS[2];
export const DAYS_A = daysBetween(A.startDate, TODAY);
/** Interest earned to today: accrued on an Accruing loan, due so far on a payout loan. */
export const earnedOf = (l) => (l.interestMode === "Accruing" ? S[l.id].interestAccrued : expectedSoFar(l));
export const receivedOf = (l) => (l.interestMode === "Accruing" ? S[l.id].interestPaid : receivedSoFar(l));
export const stillOwedOf = (l) => earnedOf(l) - receivedOf(l);
export const EARNED = LOANS.reduce((t, l) => t + earnedOf(l), 0);
export const RECEIVED = LOANS.reduce((t, l) => t + receivedOf(l), 0);
export const NOT_YET = EARNED - RECEIVED;
export const MISSED_AMT = ALL_PAYOUTS.filter((p) => !isReceived(p)).reduce((t, p) => t + p.amount, 0);
export const MISSED = ALL_PAYOUTS.filter((p) => !isReceived(p));
export const LATE_PAID = ALL_PAYOUTS.filter((p) => p.state === "late-paid");

/** What comes next, dated: every payout from today, in order. */
export function upcoming(n = 8, from = TODAY) {
  const out = [];
  for (const l of LOANS.filter((x) => x.interestMode === "Paid-out")) for (let i = 1; i <= 6; i++) { const d = addMonthsUTC(l.startDate, STEP[l.payoutFrequency] * (dueDates(l, from).length + i)); out.push({ loan: l, due: d, amount: l.payoutAmount }); }
  return out.sort((a, b) => a.due.localeCompare(b.due)).slice(0, n);
}
export const NEXT = upcoming(1)[0];

// The money that came back, newest first (SAMPLE: the matched income credits). A repayment row would join them.
export const LOG = ALL_PAYOUTS.filter(isReceived).sort((a, b) => b.got.localeCompare(a.got));

// Period figures "at today's pace" (day, month, year); all time is what has come due so far.
export const PACE = { day: PER_DAY, month: PER_YEAR_INT / 12, year: PER_YEAR_INT };
export const paceOf = (l, key) => (key === "day" ? perDay(l) : key === "month" ? (perDay(l) * 365) / 12 : perDay(l) * 365);

// Month-end accrual of the Accruing loan, for ramps
export const accruedOn = (iso) => interestAccrued(A, REPAYMENTS, iso);

export const pct = (a, b, d = 0) => (b ? ((a / b) * 100).toFixed(d) : "0");
export const sum = (a) => a.reduce((t, x) => t + x, 0);

// ---------- Checks: the figures the brief gives, to the rupee ----------
const near = (x, y, tol = 1) => Math.abs(x - y) <= tol;
if (DAYS_A !== 766) throw new Error(`days ${DAYS_A}`);
if (!near(S.a.interestAccrued, 163693, 1)) throw new Error(`A interest ${S.a.interestAccrued}`);
if (!near(S.a.owedToday, 813693, 1)) throw new Error(`A owed ${S.a.owedToday}`);
if (!near(TOTAL, 1295693, 1)) throw new Error(`total ${TOTAL}`);
if (!near(annualRatePercent(C), 39.56, 0.01) || annualRatePercent(B) !== 24) throw new Error("rates");
if (!near(perDay(A), 213.7, 0.01)) throw new Error(`A per day ${perDay(A)}`);
if (expectedSoFar(B) !== 72000 || expectedSoFar(C) !== 54000) throw new Error("expected");

// ---------- A made-up crowd, for the "many people" state (SAMPLE) ----------
const NAMES = ["Rohan", "Meera", "Kabir", "Ananya", "Vikram", "Isha", "Arjun", "Nisha", "Dev", "Tara", "Sameer", "Pooja", "Karan", "Leela", "Neel", "Riya"];
const CROWD_TERMS = [[120000, "2023-05-10", "Accruing", 12], [45000, "2024-02-01", "Accruing", 10], [250000, "2025-03-15", "Paid-out", 5000, "Monthly"], [80000, "2025-06-01", "Accruing", 12], [500000, "2024-08-20", "Accruing", 9], [60000, "2025-09-05", "Paid-out", 3000, "Monthly"], [150000, "2022-12-01", "Accruing", 12], [35000, "2026-02-14", "Accruing", 12], [300000, "2025-01-10", "Paid-out", 9000, "Quarterly"], [90000, "2024-11-25", "Accruing", 15], [200000, "2026-04-01", "Accruing", 12], [40000, "2023-10-02", "Accruing", 8], [75000, "2025-12-12", "Accruing", 12], [110000, "2024-05-05", "Accruing", 12], [28000, "2026-08-20", "Accruing", 12], [180000, "2025-07-01", "Paid-out", 4500, "Monthly"]];
const CROWD_COLORS = ["emerald", "sapphire", "ruby", "gold", "indigo", "rose", "forest", "plum", "sky", "copper"];
export const CROWD = CROWD_TERMS.map(([p, d, m, r, f], i) => ({ id: `x${i}`, borrowerName: NAMES[i], principalAmount: p, startDate: d, interestMode: m, ...(m === "Accruing" ? { interestRate: r } : { payoutAmount: r, payoutFrequency: f }), status: i === 6 ? "Repaid" : "Active", ...(i === 6 ? { closedDate: "2026-06-30" } : {}), color: CROWD_COLORS[i % CROWD_COLORS.length], tag: NAMES[i][0] }));
// Two principal repayments in the crowd, to show the Back column working.
export const CROWD_REPAYMENTS = [{ id: "r1", lentLoanId: "x0", date: "2025-12-01", amount: 40000, kind: "Principal" }, { id: "r2", lentLoanId: "x3", date: "2026-05-01", amount: 20000, kind: "Principal" }, { id: "r3", lentLoanId: "x6", date: "2026-06-30", amount: 150000, kind: "Principal" }];
export const CROWD_TOTAL = totalLentOut(CROWD, CROWD_REPAYMENTS, TODAY);
export const crowdSum = (l) => summarise(l, CROWD_REPAYMENTS, TODAY);
export { addMonthsUTC, addDays };
