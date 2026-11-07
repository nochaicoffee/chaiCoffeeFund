import { describe, expect, it } from "vitest";
import { futureAt, futureMilestones, loanBalances, monthlyRate, projectFuture, type FutureAssumptions, type FutureStart } from "./futureYou";
import { generateInstallments } from "../schedule/generateInstallments";
import type { Loan } from "../sheets/types";

const loan = { id: "l", name: "Car", lenderName: "B", category: "Auto", repaymentStructure: "Standard-Emi", principalAmount: 600000, annualInterestRate: 9.4, tenureMonths: 36, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-06-01", accountId: "a", status: "Active", firstEmiDate: "2026-07-02", stampDuty: 0, preEmiInterest: 0 } as Loan;
const rows = generateInstallments(loan).map((r, i) => ({ ...r, status: i < 4 ? "Paid" : "Pending" }));

const start: FutureStart = { bank: 100000, investments: 1000000, deposits: 500000, epf: 600000, lentOut: 200000, cards: 50000, loanBalances: [loanBalances(rows)] };
const a: FutureAssumptions = { returnPct: 8, addPerMonth: 30000, depositPct: 7, epfPct: 8.25, epfPerMonth: 8000 };

describe("monthlyRate", () => {
  it("compounds to the yearly rate over twelve months", () => {
    expect((1 + monthlyRate(8)) ** 12).toBeCloseTo(1.08, 10);
    expect(monthlyRate(0)).toBe(0);
  });
});

describe("loanBalances", () => {
  const b = loanBalances(rows);
  it("starts at what is owed now (the principal of the installments still to pay), ends at exactly zero, and never rises", () => {
    expect(b[0]).toBeCloseTo(rows.filter((r) => r.status === "Pending").reduce((s, r) => s + r.principalDue, 0), 2);
    expect(b.at(-1)).toBe(0);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeLessThanOrEqual(b[i - 1]);
    expect(b).toHaveLength(rows.filter((r) => r.status === "Pending").length + 1);
  });
  it("is just [0] for a loan with nothing left", () => {
    expect(loanBalances([{ status: "Paid", principalDue: 5, installmentNumber: 1 }])).toEqual([0]);
  });
});

describe("projectFuture", () => {
  const pts = projectFuture(start, a);
  it("starts at today's figures and runs 240 months", () => {
    expect(pts).toHaveLength(241);
    expect(pts[0].net).toBeCloseTo(100000 + 1000000 + 500000 + 600000 + 200000 - pts[0].owed, 2);
    expect(pts[0].owed).toBeCloseTo(start.loanBalances[0][0] + 50000, 2);
  });
  it("investments after a year are the start grown by the yearly rate plus each month's amount grown from when it went in", () => {
    const r = monthlyRate(8);
    let v = 1000000;
    for (let i = 0; i < 12; i++) v = v * (1 + r) + 30000;
    expect(pts[12].investments).toBeCloseTo(v, 4);
    expect(projectFuture(start, { ...a, returnPct: 0 }, 12)[12].investments).toBeCloseTo(1000000 + 12 * 30000, 6);
  });
  it("loans repay to exactly zero and what is owed falls to the cards alone, never below", () => {
    const end = start.loanBalances[0].length - 1;
    expect(pts[end].loans).toBe(0);
    expect(pts[end + 5].owed).toBe(50000);
    for (let i = 1; i < pts.length; i++) expect(pts[i].loans).toBeLessThanOrEqual(pts[i - 1].loans);
  });
  it("a higher return gives a higher net worth, and the bank, lent out and cards stay put", () => {
    const high = projectFuture(start, { ...a, returnPct: 12 });
    expect(high[240].net).toBeGreaterThan(pts[240].net);
    expect(projectFuture(start, { ...a, returnPct: 2 })[240].net).toBeLessThan(pts[240].net);
    expect(pts[240].net - (pts[240].investments + pts[240].deposits + pts[240].epf)).toBe(100000 + 200000 - 50000);
  });
  it("with nothing held and nothing added it stays at zero", () => {
    const none = projectFuture({ bank: 0, investments: 0, deposits: 0, epf: 0, lentOut: 0, cards: 0, loanBalances: [] }, { ...a, addPerMonth: 0, epfPerMonth: 0 });
    expect(none.every((p) => p.net === 0)).toBe(true);
  });
});

describe("futureAt and milestones", () => {
  const pts = projectFuture(start, a);
  it("splits the change into what growth added and what everything else did", () => {
    const f = futureAt(pts, start, a, 10);
    expect(f.point.month).toBe(120);
    expect(f.change).toBeCloseTo(f.fromGrowth + f.fromEverythingElse, 4);
    expect(f.fromGrowth).toBeGreaterThan(0);
    const flat = { ...a, returnPct: 0 };
    expect(futureAt(projectFuture(start, flat), start, flat, 10).fromGrowth).toBeCloseTo(0, 6); // no return, no growth
  });
  it("flags the loan's last month and the first month a mark is passed, soonest first", () => {
    const m = futureMilestones(pts, start, ["Car loan"]);
    expect(m.find((x) => x.label === "Car loan cleared")!.month).toBe(start.loanBalances[0].length - 1);
    const passed = m.find((x) => x.label === "Net worth passes ₹50L")!;
    expect(pts[passed.month].net).toBeGreaterThanOrEqual(5_000_000);
    expect(pts[passed.month - 1].net).toBeLessThan(5_000_000);
    expect(m.map((x) => x.month)).toEqual([...m.map((x) => x.month)].sort((p, q) => p - q));
  });
  it("leaves out a mark already passed today", () => {
    const rich = projectFuture({ ...start, investments: 80_000_000 }, a);
    expect(futureMilestones(rich, start, ["Car loan"]).some((x) => x.label.includes("₹50L"))).toBe(false);
  });
});
