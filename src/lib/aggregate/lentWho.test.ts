import { describe, expect, it } from "vitest";
import { dailyEarnings } from "./lentOut";
import { MAP_BLOCKS_MAX, whoOwesWhat } from "./lentWho";
import type { LentLoan, LentRepayment } from "../sheets/types";

const TODAY = "2026-11-06";
const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const b: LentLoan = { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active" };
const c: LentLoan = { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active" };
const pay = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

describe("dailyEarnings", () => {
  it("is principal × rate ÷ 365: ₹6,50,000 at 12% earns about ₹213.70 a day", () => {
    expect(dailyEarnings(a, [], TODAY)).toBeCloseTo(213.7, 2);
  });
  it("spreads a payout over the days: ₹6,000 a month and ₹18,000 a quarter are each about ₹197.26 a day", () => {
    expect(dailyEarnings(b, [], TODAY)).toBeCloseTo((72000 / 365), 6);
    expect(dailyEarnings(c, [], TODAY)).toBeCloseTo((72000 / 365), 6);
  });
  it("falls from the day principal comes back, and is zero once it all has", () => {
    const half = [pay("r", "a", "2026-01-01", 325000, "Principal")];
    expect(dailyEarnings(a, half, TODAY)).toBeCloseTo(213.7 / 2, 2);
    expect(dailyEarnings(a, [pay("r", "a", "2026-01-01", 650000, "Principal")], TODAY)).toBe(0);
  });
  it("times 365 is a year of the yearly interest", () => {
    expect(dailyEarnings(a, [], TODAY) * 365).toBeCloseTo(78000, 6);
  });
});

describe("whoOwesWhat on his three loans", () => {
  const w = whoOwesWhat([c, a, b], [], TODAY);

  it("totals what is owed: ₹8,13,693 + ₹3,00,000 + ₹1,82,000", () => {
    expect(w.total).toBeCloseTo(813693.15 + 300000 + 182000, 1);
    expect(Math.round(w.total)).toBe(1295693);
  });
  it("puts the biggest first, with shares of 62.8%, 23.2% and 14.0%", () => {
    expect(w.blocks.map((x) => x.loan.id)).toEqual(["a", "b", "c"]);
    expect(w.blocks.map((x) => Math.round(x.share * 1000) / 10)).toEqual([62.8, 23.2, 14.0]);
    expect(w.biggestShare).toBeCloseTo(0.628, 3);
  });
  it("has shares that add to exactly one", () => {
    expect(w.blocks.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
  });
  it("works out the total without each: ₹4,82,000 without Friend, ₹9,95,693 without the ₹3L", () => {
    expect(w.blocks[0].totalWithout).toBeCloseTo(482000, 6);
    expect(w.blocks[1].totalWithout).toBeCloseTo(995693.15, 1);
    expect(w.blocks[2].totalWithout).toBeCloseTo(1113693.15, 1);
    expect(Math.round(w.blocks[0].remainingWithout * 100)).toBe(37);
  });
  it("has a block's owed plus the total without it equal the whole, for every block", () => {
    for (const x of w.blocks) expect(x.owedToday + x.totalWithout).toBeCloseTo(w.total, 6);
  });
  it("earns about ₹608 a day, and without each falls by that loan's part", () => {
    expect(w.perDay).toBeCloseTo(608.2, 1);
    for (const x of w.blocks) expect(x.perDay + x.perDayWithout).toBeCloseTo(w.perDay, 9);
  });
  it("is blocks, not a list, for three borrowers", () => {
    expect(w.asList).toBe(false);
    expect(MAP_BLOCKS_MAX).toBe(3);
  });
});

describe("repaid loans and a long list", () => {
  it("takes a repaid loan out of the map, and works the shares over what is still out", () => {
    const repaid: LentLoan = { ...b, status: "Repaid", closedDate: "2026-06-01" };
    const w = whoOwesWhat([a, repaid, c], [], TODAY);
    expect(w.blocks.map((x) => x.loan.id)).toEqual(["a", "c"]);
    expect(w.repaid.map((l) => l.id)).toEqual(["b"]);
    expect(w.blocks.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
    expect(w.total).toBeCloseTo(813693.15 + 182000, 1);
  });
  it("lists repaid loans most recently closed first", () => {
    const one: LentLoan = { ...b, id: "r1", status: "Repaid", closedDate: "2026-01-01" };
    const two: LentLoan = { ...b, id: "r2", status: "Repaid", closedDate: "2026-05-01" };
    expect(whoOwesWhat([one, two], [], TODAY).repaid.map((l) => l.id)).toEqual(["r2", "r1"]);
  });
  it("shows what remains after part of the principal came back", () => {
    const w = whoOwesWhat([a], [pay("r", "a", "2026-01-01", 200000, "Principal")], TODAY);
    expect(w.blocks[0].summary.principalOutstanding).toBe(450000);
  });
  it("becomes a list past three borrowers", () => {
    const four = ["w", "x", "y", "z"].map((id): LentLoan => ({ ...b, id }));
    expect(whoOwesWhat(four, [], TODAY).asList).toBe(true);
  });
  it("says nothing is out, and divides by nothing, when no loan is", () => {
    const w = whoOwesWhat([], [], TODAY);
    expect(w).toMatchObject({ total: 0, perDay: 0, blocks: [], asList: false, repaid: [] });
    expect(w.biggestShare).toBeUndefined();
    const onlyRepaid = whoOwesWhat([{ ...b, status: "Repaid", closedDate: "2026-06-01" }], [], TODAY);
    expect(onlyRepaid.total).toBe(0);
  });
  it("keeps an Active loan that owes nothing out of the map, as repaid, instead of a zero-size block", () => {
    const allBack = [pay("r", "b", "2026-06-01", 300000, "Principal")];
    const w = whoOwesWhat([a, b, c], allBack, TODAY);
    expect(w.blocks.map((x) => x.loan.id)).toEqual(["a", "c"]);
    expect(w.repaid.map((l) => l.id)).toEqual(["b"]);
    expect(w.blocks.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
  });
  it("does the same for a loan that hasn't started yet on the day asked about", () => {
    const w = whoOwesWhat([a, c], [], "2025-12-01");
    expect(w.blocks.map((x) => x.loan.id)).toEqual(["a"]);
    expect(w.repaid.map((l) => l.id)).toEqual(["c"]);
  });
});
