import { describe, expect, it } from "vitest";
import {
  annualRatePercent,
  interestAccrued,
  lentLoanColor,
  principalOutstanding,
  summariseLentLoan,
  totalLentOut,
} from "./lentOut";
import type { LentLoan, LentRepayment } from "../sheets/types";

const accruing: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const monthly: LentLoan = { id: "m", borrowerName: "B", principalAmount: 300000, startDate: "2025-01-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active" };
const quarterly: LentLoan = { id: "q", borrowerName: "C", principalAmount: 182000, startDate: "2025-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active" };
const pay = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

describe("annualRatePercent", () => {
  it("is the stated rate for an Accruing loan", () => expect(annualRatePercent(accruing)).toBe(12));
  it("works out a monthly payout's rate: ₹6,000 a month on ₹3,00,000 is 24%", () => expect(annualRatePercent(monthly)).toBe(24));
  it("works out a quarterly payout's rate: ₹18,000 a quarter on ₹1,82,000 is 39.56%", () => expect(annualRatePercent(quarterly)).toBeCloseTo(39.5604, 3));
});

describe("interestAccrued: simple interest, actual days over 365", () => {
  it("is zero on the day it was lent and before", () => {
    expect(interestAccrued(accruing, [], "2024-10-01")).toBe(0);
    expect(interestAccrued(accruing, [], "2024-09-01")).toBe(0);
  });

  it("is a year of 12% on ₹6,50,000 after 365 days: ₹78,000", () => {
    expect(interestAccrued(accruing, [], "2025-10-01")).toBeCloseTo(78000, 6);
  });

  it("is the same every year: it never compounds", () => {
    // 2024-10-01 to 2026-10-01 is 730 days, exactly two years of 365.
    expect(interestAccrued(accruing, [], "2026-10-01")).toBeCloseTo(156000, 6);
  });

  it("grows by the same amount each day (a straight line)", () => {
    const daily = (650000 * 0.12) / 365;
    const a = interestAccrued(accruing, [], "2026-01-10");
    const b = interestAccrued(accruing, [], "2026-01-11");
    expect(b - a).toBeCloseTo(daily, 8);
  });

  it("is ₹1,63,479.45 on 2026-11-05 (765 days)", () => {
    expect(interestAccrued(accruing, [], "2026-11-05")).toBeCloseTo((650000 * 0.12 * 765) / 365, 6);
  });

  it("stops earning on the principal paid back, from the day it is paid", () => {
    // 365 days on all of it (₹78,000), then half is paid back: the next 365 days earn on ₹3,25,000 (₹39,000).
    const repayments = [pay("r1", "a", "2025-10-01", 325000, "Principal")];
    expect(interestAccrued(accruing, repayments, "2026-10-01")).toBeCloseTo(78000 + 39000, 6);
  });

  it("stops entirely once all the principal is back", () => {
    const repayments = [pay("r1", "a", "2025-10-01", 650000, "Principal")];
    expect(interestAccrued(accruing, repayments, "2026-10-01")).toBeCloseTo(78000, 6);
    expect(interestAccrued(accruing, repayments, "2030-10-01")).toBeCloseTo(78000, 6);
  });

  it("ignores a repayment dated after the day asked about", () => {
    const repayments = [pay("r1", "a", "2026-06-01", 650000, "Principal")];
    expect(interestAccrued(accruing, repayments, "2025-10-01")).toBeCloseTo(78000, 6);
  });

  it("ignores another loan's repayments", () => {
    const repayments = [pay("r1", "other", "2025-10-01", 650000, "Principal")];
    expect(interestAccrued(accruing, repayments, "2025-10-01")).toBeCloseTo(78000, 6);
  });

  it("is nothing for a Paid-out loan: its interest arrives as income", () => {
    expect(interestAccrued(monthly, [], "2026-11-05")).toBe(0);
  });

  it("stops on the closing day of a repaid loan", () => {
    const repaid: LentLoan = { ...accruing, status: "Repaid", closedDate: "2025-10-01" };
    expect(interestAccrued(repaid, [], "2026-11-05")).toBeCloseTo(78000, 6);
  });
});

describe("summariseLentLoan", () => {
  it("owes the principal plus all the interest when nothing has been paid", () => {
    const s = summariseLentLoan(accruing, [], "2025-10-01");
    expect(s.principalOutstanding).toBe(650000);
    expect(s.interestOwed).toBeCloseTo(78000, 6);
    expect(s.owedToday).toBeCloseTo(728000, 6);
  });

  it("takes interest paid off what is owed, and leaves the principal alone", () => {
    const repayments = [pay("r1", "a", "2025-10-01", 30000, "Interest")];
    const s = summariseLentLoan(accruing, repayments, "2025-10-01");
    expect(s.interestPaid).toBe(30000);
    expect(s.interestOwed).toBeCloseTo(48000, 6);
    expect(s.principalOutstanding).toBe(650000);
  });

  it("never lets an overpaid interest turn into a debt", () => {
    const repayments = [pay("r1", "a", "2025-10-01", 100000, "Interest")];
    expect(summariseLentLoan(accruing, repayments, "2025-10-01").interestOwed).toBe(0);
  });

  it("is fully repaid to exactly zero when the principal and the interest are both paid", () => {
    const repayments = [pay("r1", "a", "2025-10-01", 650000, "Principal"), pay("r2", "a", "2025-10-01", 78000, "Interest")];
    const s = summariseLentLoan(accruing, repayments, "2025-10-01");
    expect(s.owedToday).toBeCloseTo(0, 6);
  });

  it("owes a Paid-out loan's principal only, since its interest is income", () => {
    const s = summariseLentLoan(monthly, [], "2026-11-05");
    expect(s.owedToday).toBe(300000);
    expect(s.interestOwed).toBe(0);
  });

  it("owes nothing once marked Repaid, whatever its rows say", () => {
    const repaid: LentLoan = { ...monthly, status: "Repaid", closedDate: "2026-06-01" };
    expect(summariseLentLoan(repaid, [], "2026-11-05").owedToday).toBe(0);
  });
});

describe("principalOutstanding", () => {
  it("is nothing before the loan began", () => expect(principalOutstanding(monthly, [], "2024-12-31")).toBe(0));
  it("drops by principal paid, and never goes below zero", () => {
    const repayments = [pay("r1", "m", "2026-01-01", 100000, "Principal"), pay("r2", "m", "2026-02-01", 500000, "Principal")];
    expect(principalOutstanding(monthly, repayments.slice(0, 1), "2026-11-05")).toBe(200000);
    expect(principalOutstanding(monthly, repayments, "2026-11-05")).toBe(0);
  });
});

describe("a repaid loan", () => {
  const repaid: LentLoan = { ...monthly, status: "Repaid", closedDate: "2026-06-01" };
  it("still counts as outstanding on a day before its closing day, and is nothing from it on", () => {
    expect(summariseLentLoan(repaid, [], "2026-03-01").owedToday).toBe(300000);
    expect(summariseLentLoan(repaid, [], "2026-06-01").owedToday).toBe(0);
  });
});

describe("totals", () => {
  it("adds up what every borrower still owes: ₹6,50,000 + interest, ₹3,00,000 and ₹1,82,000", () => {
    const total = totalLentOut([accruing, monthly, quarterly], [], "2026-11-05");
    expect(total).toBeCloseTo(650000 + (650000 * 0.12 * 765) / 365 + 300000 + 182000, 4);
  });
});

describe("lentLoanColor", () => {
  it("is the colour the loan was given", () => {
    expect(lentLoanColor({ id: "a", color: "Copper" })).toBe("Copper");
  });
  it("is the same colour for the same id every time, whatever else is in the list", () => {
    expect(lentLoanColor({ id: "7e34e43c-9bc9-4520-8722-757e7ab0ce72" })).toBe(lentLoanColor({ id: "7e34e43c-9bc9-4520-8722-757e7ab0ce72" }));
  });
  it("spreads different ids over the palette", () => {
    const colours = new Set(Array.from({ length: 40 }, (_, i) => lentLoanColor({ id: `loan-${i}` })));
    expect(colours.size).toBeGreaterThan(10);
  });
});
