import { describe, expect, it } from "vitest";
import { comingUpView, loansTableView, moneyBackView } from "./widgetsView";
import { lentModel, type LentData } from "./views";
import type { IncomeEntry, IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

const TODAY = "2026-11-06";
const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const b: LentLoan = { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active", incomeSourceId: "sb" };
const c: LentLoan = { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active", incomeSourceId: "sc" };
const sb: IncomeSource = { id: "sb", name: "B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" };
const sc: IncomeSource = { id: "sc", name: "C", alias: "C", category: "Investment", frequency: "Quarterly", expectedAmount: 18000, status: "Active", scheduleDate: "2026-04-01" };
let n = 0;
const got = (sourceId: string, expected: string, received: string, amount: number): IncomeEntry => ({ id: `e${++n}`, incomeSourceId: sourceId, expectedDate: expected, receivedDate: received, amount, status: "Received", tag: "Regular" });
const entries: IncomeEntry[] = [
  got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-01-01", "2026-01-02", 6000), got("sb", "2026-03-01", "2026-03-10", 6000), got("sb", "2026-04-01", "2026-04-01", 6000),
  got("sb", "2026-05-01", "2026-05-02", 6000), got("sb", "2026-06-01", "2026-06-01", 6000), got("sb", "2026-07-01", "2026-07-01", 6000), got("sb", "2026-08-01", "2026-08-03", 6000),
  got("sb", "2026-09-01", "2026-09-01", 6000), got("sb", "2026-10-01", "2026-10-01", 6000),
  got("sc", "2026-04-01", "2026-04-01", 18000), got("sc", "2026-07-01", "2026-07-04", 18000), got("sc", "2026-10-01", "2026-10-01", 18000),
];
const data: LentData = { loans: [a, b, c], repayments: [], sources: [sb, sc], entries };
const pay = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

describe("loansTableView on his three loans", () => {
  const t = loansTableView(lentModel(data, TODAY))!;
  const [ra, rb, rc] = t.rows;

  it("has a row per loan, biggest owed first", () => {
    expect(t.rows.map((r) => [r.name, r.owed])).toEqual([["Friend", "₹8,13,693"], ["Friend – ₹3L", "₹3,00,000"], ["Friend – ₹1.82L", "₹1,82,000"]]);
  });
  it("words the 12% loan's row: rate, lump sum, nothing back, ₹1,63,693 piling up, no due date", () => {
    expect(ra).toMatchObject({ kind: "Accruing", rate: "12%", rateNote: "simple, a year", lentAmount: "₹6,50,000", lentNote: "one lump sum", back: "₹0", backNote: "none returned", interest: "₹1,63,693", interestNote: "owed · piling up ₹214 a day", owedNote: "principal + interest", next: "No date", nextNote: "paid when they pay" });
    expect(ra.lent).toBe("lent Oct 1, 2024 · 766 days");
  });
  it("words a payout loan's row: its rate from the payout, interest so far with what is in and not here, the next payout", () => {
    expect(rb).toMatchObject({ kind: "Paid-out", rate: "24%", rateNote: "from the payout", lentNote: "₹6,000 a month", interest: "₹72,000", interestNote: "so far: ₹60,000 in, ₹12,000 not here", interestWarn: true, owedNote: "principal only", next: "Dec 1, 2026", nextNote: "in 25 days · ₹6,000" });
    expect(rb.verdicts).toHaveLength(12);
    expect(rc).toMatchObject({ rate: "39.6%", lentNote: "₹18,000 a quarter", interest: "₹54,000", interestNote: "so far: ₹54,000 in", interestWarn: false, next: "Jan 1, 2027" });
  });
  it("totals what was lent, what came back, the interest and what is owed", () => {
    expect(t.total).toEqual({ lent: "₹11,32,000", back: "₹0", interest: "₹2,89,693", interestNote: "₹1,14,000 received · ₹1,75,693 not yet", owed: "₹12,95,693" });
  });
  it("says a payout loan with no income source isn't tracked, instead of showing nothing is owed", () => {
    const t2 = loansTableView(lentModel({ ...data, loans: [{ ...b, incomeSourceId: undefined }], sources: [] }, TODAY))!;
    expect(t2.rows[0]).toMatchObject({ interest: "—", interestNote: "no income source, not tracked", next: "—", nextNote: "not tracked" });
    expect(t2.rows[0].verdicts).toBeUndefined();
  });
  it("shows what came back on a part-repaid loan, and keeps a repaid loan as a closed row", () => {
    const t3 = loansTableView(lentModel({ ...data, loans: [a, { ...b, status: "Repaid", closedDate: "2026-06-01" }], repayments: [pay("r", "a", "2026-01-01", 200000, "Principal")] }, TODAY))!;
    expect(t3.rows[0]).toMatchObject({ back: "₹2,00,000", backNote: "principal" });
    expect(t3.rows[1]).toMatchObject({ repaid: true, owed: "₹0", owedNote: "repaid", nextNote: "repaid Jun 1" });
  });
  it("keeps interest paid on the 12% loan in its row and in the total, so earned, received and not yet add up", () => {
    const t4 = loansTableView(lentModel({ loans: [a], repayments: [pay("r", "a", "2026-06-01", 40000, "Interest")], sources: [], entries: [] }, TODAY))!;
    expect(t4.rows[0]).toMatchObject({ interest: "₹1,63,693", interestNote: "₹1,23,693 owed, ₹40,000 paid", owed: "₹7,73,693" });
    expect(t4.total).toMatchObject({ interest: "₹1,63,693", interestNote: "₹40,000 received · ₹1,23,693 not yet" });
  });
  it("is nothing when nothing was ever lent", () => {
    expect(loansTableView(lentModel({ loans: [], repayments: [], sources: [], entries: [] }, TODAY))).toBeNull();
  });
});

describe("comingUpView", () => {
  const v = comingUpView(lentModel(data, TODAY))!;

  it("leads with the overdue payout, then the 12% pile, then the dated payouts in order", () => {
    expect(v.rows[0]).toMatchObject({ overdue: true, title: "Friend – ₹3L", amount: "₹6,000", when: "5 days over", day: "1", month: "NOV" });
    expect(v.rows[0].note).toBe("₹6,000 a month · due Sun · not matched to a bank credit yet");
    expect(v.rows[1]).toMatchObject({ daily: true, title: "Friend", amount: "+₹214", when: "a day, ₹6,411 in 30" });
    const dated = v.rows.slice(2);
    expect(dated.map((r) => r.date)).toEqual([...dated.map((r) => r.date)].sort());
    expect(dated[0]).toMatchObject({ date: "2026-12-01", amount: "₹6,000", when: "in 25 days", note: "₹6,000 a month · Tue" });
  });
  it("lists a year of payouts from today, never one that arrived", () => {
    const dates = v.rows.filter((r) => r.date && !r.overdue).map((r) => `${r.title}|${r.date}`);
    expect(dates).toContain("Friend – ₹3L|2027-10-01");
    expect(dates).not.toContain("Friend – ₹3L|2026-10-01");
    expect(new Set(dates).size).toBe(dates.length);
  });
  it("is nothing when there is nothing to come", () => {
    expect(comingUpView(lentModel({ loans: [{ ...a, status: "Repaid", closedDate: "2026-01-01" }], repayments: [], sources: [], entries: [] }, TODAY))).toBeNull();
  });
  it("shows no payouts for a loan with no income source, only its daily pile", () => {
    const v2 = comingUpView(lentModel({ ...data, loans: [a, { ...b, incomeSourceId: undefined }], sources: [] }, TODAY))!;
    expect(v2.rows.map((r) => r.daily)).toEqual([true]);
  });
});

describe("moneyBackView", () => {
  const v = moneyBackView(lentModel(data, TODAY))!;

  it("lists what arrived newest first, each as on time or late, with the day it was due", () => {
    expect(v.rows.slice(0, 3).map((r) => [r.day, r.month, r.title, r.tag, r.amount, r.when])).toEqual([
      ["1", "OCT", "Friend – ₹3L", "on time", "₹6,000", "due Oct 1"],
      ["1", "OCT", "Friend – ₹1.82L", "on time", "₹18,000", "due Oct 1"],
      ["1", "SEP", "Friend – ₹3L", "on time", "₹6,000", "due Sep 1"],
    ]);
    expect(v.rows.some((r) => r.tag === "late" && r.when === "due Mar 1")).toBe(true);
    expect(v.rows.filter((r) => r.title === "Friend – ₹3L")).toHaveLength(10);
    const dates = v.rows.map((r) => r.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
  it("says no principal has come back when none has", () => {
    expect(v.empty).toBe("No principal has come back yet, so there are no repayments to log. The interest on Friend's loan will land here as a repayment when they pay.");
  });
  it("adds the repayments he recorded, and drops the empty note once principal has come back", () => {
    const withPay = moneyBackView(lentModel({ ...data, repayments: [pay("r1", "a", "2026-09-15", 50000, "Principal"), pay("r2", "a", "2026-10-15", 5000, "Interest")] }, TODAY))!;
    expect(withPay.empty).toBeUndefined();
    expect(withPay.rows[0]).toMatchObject({ tag: "interest", amount: "₹5,000", note: "Interest · recorded by you", when: "came back", day: "15", month: "OCT" });
    expect(withPay.rows.find((r) => r.tag === "principal")).toMatchObject({ amount: "₹50,000", note: "Principal · recorded by you", month: "SEP" });
    expect(withPay.rows[1]).toMatchObject({ tag: "on time", note: "Interest · from Income, matched to the bank credit" });
  });
  it("is nothing when there is nothing at all and no empty note to show", () => {
    expect(moneyBackView(lentModel({ loans: [], repayments: [], sources: [], entries: [] }, TODAY))!.rows).toEqual([]);
  });
});
