import { describe, expect, it } from "vitest";
import { generateInstallments, standardEmi } from "./generateInstallments";
import { dayInterest, planSchedule, prepaymentCharge, rebuildSchedule, scheduleWithPrepayments } from "./prepayments";
import type { Loan, LoanInstallment } from "../sheets/types";

// The HDFC personal loan from generateInstallments.test.ts: ₹11,10,000 at 9.99% for 12 EMIs, due on the 7th.
const hdfc: Omit<Loan, "id"> = {
  name: "Personal loan",
  lenderName: "HDFC Bank",
  category: "Personal",
  repaymentStructure: "Standard-Emi",
  principalAmount: 1110000,
  annualInterestRate: 9.99,
  tenureMonths: 12,
  paymentFrequency: "Monthly",
  processingFee: 7669,
  disbursementDate: "2026-07-04",
  accountId: "acc-1",
  status: "Active",
  firstEmiDate: "2026-08-07",
  stampDuty: 500,
  preEmiInterest: 911,
};
const schedule = generateInstallments(hdfc);
const principalOf = (rows: { principalDue: number }[]) => Math.round(rows.reduce((t, r) => t + r.principalDue, 0) * 100);

describe("the interest on a prepaid amount for the days since the last EMI", () => {
  it("is actual/365 to the rupee, like the agreement's pre-EMI interest", () => {
    // The agreement's pre-EMI interest: ₹11,10,000 × 9.99% × 3/365 = ₹911.
    expect(dayInterest(1110000, 9.99, 3)).toBe(911);
    expect(dayInterest(100000, 9.99, 13)).toBe(356);
    expect(dayInterest(100000, 9.99, 0)).toBe(0);
  });
});

describe("rebuildSchedule, reducing the tenure", () => {
  // ₹1,00,000 on Aug 20, 13 days after EMI 1.
  const rebuild = rebuildSchedule(hdfc, schedule, { date: "2026-08-20", amount: 100000, effect: "Reduce-Tenure" });

  it("replaces only the installments after the prepayment", () => {
    expect(rebuild.afterInstallment).toBe(1);
    expect(rebuild.removed.map((r) => r.installmentNumber)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(rebuild.balanceBefore).toBe(schedule[1].openingBalance);
    expect(rebuild.balanceAfter).toBe(Math.round((schedule[1].openingBalance - 100000) * 100) / 100);
  });

  it("keeps the EMI, needs fewer installments, and repays the new balance exactly", () => {
    expect(rebuild.emiAfter).toBe(schedule[1].totalDue);
    expect(rebuild.added.length).toBeLessThan(rebuild.removed.length);
    for (const row of rebuild.added.slice(0, -1)) expect(row.totalDue).toBe(schedule[1].totalDue);
    expect(rebuild.added.at(-1)!.totalDue).toBeLessThanOrEqual(schedule[1].totalDue);
    expect(principalOf(rebuild.added)).toBe(Math.round(rebuild.balanceAfter * 100));
  });

  it("charges a normal month on the new balance plus the prepaid amount's 13 days in the next EMI", () => {
    const r = 9.99 / 12 / 100;
    expect(rebuild.days).toBe(13);
    expect(rebuild.added[0].interestDue).toBe(Math.round(rebuild.balanceAfter * r) + 356);
    expect(rebuild.added[1].interestDue).toBe(Math.round(rebuild.added[1].openingBalance * r));
  });

  it("carries the numbers on and keeps the due day", () => {
    expect(rebuild.added.map((r) => r.installmentNumber)).toEqual(rebuild.added.map((_, i) => i + 2));
    expect(rebuild.added.every((r) => r.dueDate.endsWith("-07"))).toBe(true);
    expect(rebuild.added[0].dueDate).toBe("2026-09-07");
  });

  it("saves the interest the removed installments had less what the new ones have", () => {
    const sum = (rows: { interestDue: number }[]) => rows.reduce((t, r) => t + r.interestDue, 0);
    expect(rebuild.interestSaved).toBeCloseTo(sum(rebuild.removed) - sum(rebuild.added), 2);
    expect(rebuild.interestSaved).toBeGreaterThan(0);
  });
});

describe("rebuildSchedule, reducing the EMI", () => {
  const rebuild = rebuildSchedule(hdfc, schedule, { date: "2026-08-07", amount: 100000, effect: "Reduce-Emi" });

  it("keeps the number of installments and the end date", () => {
    expect(rebuild.added).toHaveLength(rebuild.removed.length);
    expect(rebuild.added.at(-1)!.dueDate).toBe(rebuild.removed.at(-1)!.dueDate);
  });

  it("works the new EMI out from the annuity formula on the new balance", () => {
    expect(rebuild.emiAfter).toBe(standardEmi(rebuild.balanceAfter, 9.99, 11));
    expect(rebuild.emiAfter).toBeLessThan(rebuild.emiBefore);
    expect(principalOf(rebuild.added)).toBe(Math.round(rebuild.balanceAfter * 100));
  });

  it("adds no day interest when it's paid on an EMI's due date", () => {
    expect(rebuild.days).toBe(0);
    expect(rebuild.added[0].interestDue).toBe(Math.round(rebuild.balanceAfter * (9.99 / 1200)));
  });
});

describe("rebuildSchedule, closing the loan", () => {
  it("pays off everything left whatever the amount, and removes every installment after it", () => {
    const rebuild = rebuildSchedule(hdfc, schedule, { date: "2026-09-10", amount: 1, effect: "Close" });
    expect(rebuild.closes).toBe(true);
    expect(rebuild.amount).toBe(schedule[2].openingBalance);
    expect(rebuild.added).toEqual([]);
    expect(rebuild.removed.map((r) => r.installmentNumber)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("closes the loan when a reduce-tenure prepayment covers what's left", () => {
    const rebuild = rebuildSchedule(hdfc, schedule, { date: "2027-06-07", amount: 200000, effect: "Reduce-Tenure" });
    expect(rebuild.closes).toBe(true);
    expect(rebuild.amount).toBe(schedule[11].openingBalance);
  });
});

describe("rebuildSchedule with the bank's own figures", () => {
  it("uses the bank's EMI and number of EMIs instead of its own", () => {
    const rebuild = rebuildSchedule(hdfc, schedule, { date: "2026-08-07", amount: 100000, effect: "Reduce-Emi", bankEmi: 88800, bankInstallments: 11 });
    expect(rebuild.added).toHaveLength(11);
    for (const row of rebuild.added.slice(0, -1)) expect(row.totalDue).toBe(88800);
    expect(principalOf(rebuild.added)).toBe(Math.round(rebuild.balanceAfter * 100));
  });
});

describe("rebuildSchedule after an EMI paid early with more than the EMI", () => {
  it("keeps that EMI and rebuilds from the next one", () => {
    // EMI 2 is due Sep 7; it's paid on Sep 1 with extra, so the prepayment comes after EMI 2, not EMI 1.
    const rebuild = rebuildSchedule(hdfc, schedule, { date: "2026-09-01", amount: 50000, effect: "Reduce-Tenure", afterInstallment: 2 });
    expect(rebuild.afterInstallment).toBe(2);
    expect(rebuild.removed[0].installmentNumber).toBe(3);
    expect(rebuild.days).toBe(0);
  });
});

describe("scheduleWithPrepayments", () => {
  it("is the plain schedule when there are none", () => {
    expect(scheduleWithPrepayments(hdfc, [])).toEqual(schedule);
  });

  it("applies prepayments in date order, whatever order they come in", () => {
    const a = { date: "2026-08-20", amount: 100000, effect: "Reduce-Tenure" as const };
    const b = { date: "2026-12-10", amount: 50000, effect: "Reduce-Emi" as const };
    const rows = scheduleWithPrepayments(hdfc, [b, a]);
    expect(rows).toEqual(scheduleWithPrepayments(hdfc, [a, b]));
    expect(principalOf(rows)).toBe(Math.round((1110000 - 150000) * 100));
    // Numbers stay a run from 1, with no gaps.
    expect(rows.map((r) => r.installmentNumber)).toEqual(rows.map((_, i) => i + 1));
  });

  it("stops at a prepayment that closes the loan", () => {
    const rows = scheduleWithPrepayments(hdfc, [{ date: "2026-09-10", amount: 0, effect: "Close" }, { date: "2026-12-10", amount: 50000, effect: "Reduce-Emi" }]);
    expect(rows.map((r) => r.installmentNumber)).toEqual([1, 2]);
  });
});

describe("planSchedule", () => {
  const stored: LoanInstallment[] = schedule.map((row, i) => ({ ...row, id: `i${i + 1}`, loanId: "loan", ...(i < 2 ? { status: "Paid" as const, amountPaid: row.totalDue, paidDate: row.dueDate } : {}) }));

  it("never touches a paid installment, updates pending ones in place, and removes the ones that are gone", () => {
    const target = scheduleWithPrepayments(hdfc, [{ date: "2026-09-10", amount: 300000, effect: "Reduce-Tenure" }]).map((r) => ({ ...r, loanId: "loan" }));
    const plan = planSchedule(stored, target);
    const touched = [...plan.update.map((u) => u.id), ...plan.remove];
    expect(touched).not.toContain("i1");
    expect(touched).not.toContain("i2");
    expect(plan.create).toEqual([]);
    expect(plan.remove.length).toBe(12 - target.length);
    expect(plan.update.map((u) => u.id)).toEqual(target.slice(2).map((r) => `i${r.installmentNumber}`));
  });

  it("has nothing to do when the stored schedule already matches", () => {
    expect(planSchedule(stored, schedule.map((r) => ({ ...r, loanId: "loan" })))).toEqual({ create: [], update: [], remove: [] });
  });

  it("creates the installment numbers that aren't stored yet", () => {
    const plan = planSchedule(stored.slice(0, 10), schedule);
    expect(plan.create.map((r) => r.installmentNumber)).toEqual([11, 12]);
  });
});

describe("prepaymentCharge", () => {
  it("is the bank's percentage plus 18% GST, to the rupee", () => {
    // The forms' sample: 4% + GST of ₹50,000 is ₹2,360, and of ₹20,107 is ₹949.
    expect(prepaymentCharge({ prepaymentChargePercent: 4 }, 50000)).toBe(2360);
    expect(prepaymentCharge({ prepaymentChargePercent: 4 }, 20107)).toBe(949);
    expect(prepaymentCharge({}, 50000)).toBe(0);
  });
});
