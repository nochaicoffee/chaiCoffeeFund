import { describe, expect, it } from "vitest";
import { readLentLoanForm, readRepaidForm, readRepaymentForm } from "./lentForms";
import type { LentLoan, LentRepayment } from "../sheets/types";

const TODAY = "2026-11-06";
const accruing = { borrowerName: "Friend", principalAmount: "6,50,000", startDate: "2024-10-01", interestMode: "Accruing", interestRate: "12" };
const paidOut = { borrowerName: "Friend", principalAmount: "3,00,000", startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: "6000" };
const loan: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const payoutLoan: LentLoan = { id: "b", borrowerName: "B", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active" };
const back = (id: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId: "a", date, amount, kind });

describe("readLentLoanForm", () => {
  it("reads an Accruing loan with its rate, and a Paid-out loan with how often and how much", () => {
    expect(readLentLoanForm(accruing, {}, TODAY)).toEqual({ ok: true, input: { borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12 } });
    expect(readLentLoanForm(paidOut, {}, TODAY)).toEqual({ ok: true, input: { borrowerName: "Friend", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000 } });
  });
  it("ignores the other mode's fields, so switching the mode drops them", () => {
    const r = readLentLoanForm({ ...accruing, payoutFrequency: "Monthly", payoutAmount: "6000" }, {}, TODAY);
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.input).not.toHaveProperty("payoutAmount");
  });
  it("asks for what is missing, by field, in plain words", () => {
    const r = readLentLoanForm({}, {}, TODAY);
    expect(r).toMatchObject({ ok: false, errors: { borrowerName: expect.any(String), principalAmount: expect.any(String), startDate: expect.any(String), interestMode: expect.any(String) } });
    expect(readLentLoanForm({ ...accruing, interestRate: "" }, {}, TODAY)).toMatchObject({ ok: false, errors: { interestRate: "Enter the yearly rate" } });
    expect(readLentLoanForm({ ...paidOut, payoutFrequency: "", payoutAmount: "" }, {}, TODAY)).toMatchObject({ ok: false, errors: { payoutFrequency: expect.any(String), payoutAmount: expect.any(String) } });
  });
  it("refuses a rate of nothing or over 100, nothing lent, and a day that hasn't come", () => {
    expect(readLentLoanForm({ ...accruing, interestRate: "0" }, {}, TODAY)).toMatchObject({ ok: false, errors: { interestRate: expect.stringContaining("percentage") } });
    expect(readLentLoanForm({ ...accruing, interestRate: "120" }, {}, TODAY)).toMatchObject({ ok: false });
    expect(readLentLoanForm({ ...accruing, principalAmount: "0" }, {}, TODAY)).toMatchObject({ ok: false, errors: { principalAmount: expect.any(String) } });
    expect(readLentLoanForm({ ...accruing, startDate: "2026-12-01" }, {}, TODAY)).toMatchObject({ ok: false, errors: { startDate: expect.any(String) } });
  });
  it("won't let a loan start after a repayment already recorded", () => {
    expect(readLentLoanForm(accruing, { earliestRepayment: "2024-09-01" }, TODAY)).toMatchObject({ ok: false, errors: { startDate: expect.stringContaining("repayment") } });
    expect(readLentLoanForm(accruing, { earliestRepayment: "2025-01-01" }, TODAY)).toMatchObject({ ok: true });
  });
  it("won't let the amount lent drop below the principal already back", () => {
    expect(readLentLoanForm({ ...accruing, principalAmount: "1,00,000" }, { principalReturned: 200000 }, TODAY)).toMatchObject({ ok: false, errors: { principalAmount: expect.stringContaining("₹2,00,000") } });
    expect(readLentLoanForm({ ...accruing, principalAmount: "2,00,000" }, { principalReturned: 200000 }, TODAY)).toMatchObject({ ok: true });
  });
  it("takes a colour from the palette or none", () => {
    expect(readLentLoanForm({ ...accruing, color: "Copper" }, {}, TODAY)).toMatchObject({ ok: true, input: { color: "Copper" } });
    expect(readLentLoanForm({ ...accruing, color: "Nope" }, {}, TODAY)).toMatchObject({ ok: false, errors: { color: expect.any(String) } });
  });
});

describe("readRepaymentForm", () => {
  const base = { kind: "Principal", date: "2026-06-01", amount: "1,00,000" };
  it("reads a repayment of principal", () => {
    expect(readRepaymentForm(base, loan, [], TODAY)).toEqual({ ok: true, input: { date: "2026-06-01", amount: 100000, kind: "Principal" } });
  });
  it("warns, rather than blocks, when principal is more than what is out that day, and goes through when confirmed", () => {
    const over = { ...base, amount: "7,00,000" };
    const first = readRepaymentForm(over, loan, [], TODAY);
    expect(first).toMatchObject({ ok: false, overridable: true, errors: { amount: "That's more than the ₹6,50,000 that would still be out" } });
    expect(readRepaymentForm({ ...over, confirmed: "1" }, loan, [], TODAY)).toMatchObject({ ok: true, input: { amount: 700000 } });
  });
  it("warns about a back-dated repayment that fits on its day but takes the total above what was lent", () => {
    const later = [back("r", "2026-06-01", 500000, "Principal")];
    expect(readRepaymentForm({ ...base, date: "2026-01-01", amount: "3,00,000" }, loan, later, TODAY)).toMatchObject({ ok: false, overridable: true, errors: { amount: expect.stringContaining("₹1,50,000") } });
    expect(readRepaymentForm({ ...base, date: "2026-01-01", amount: "1,50,000" }, loan, later, TODAY)).toMatchObject({ ok: true });
  });
  it("counts what already came back: after ₹4,00,000, ₹3,00,000 is over", () => {
    const earlier = [back("r", "2026-01-01", 400000, "Principal")];
    expect(readRepaymentForm({ ...base, amount: "3,00,000" }, loan, earlier, TODAY)).toMatchObject({ ok: false, overridable: true });
    expect(readRepaymentForm({ ...base, amount: "2,50,000" }, loan, earlier, TODAY)).toMatchObject({ ok: true });
  });
  it("warns when interest is more than is owed that day (₹78,000 after a year at 12%)", () => {
    const f = { kind: "Interest", date: "2025-10-01", amount: "80,000" };
    expect(readRepaymentForm(f, loan, [], TODAY)).toMatchObject({ ok: false, overridable: true, errors: { amount: expect.stringContaining("₹78,000") } });
    expect(readRepaymentForm({ ...f, amount: "78,000" }, loan, [], TODAY)).toMatchObject({ ok: true });
  });
  it("refuses interest on a Paid-out loan, since it arrives through Income and would be counted twice", () => {
    expect(readRepaymentForm({ ...base, kind: "Interest", amount: "6000" }, payoutLoan, [], TODAY)).toMatchObject({ ok: false, errors: { kind: expect.stringContaining("Income") } });
  });
  it("refuses a repayment on a repaid loan, before the loan, or on a day that hasn't come", () => {
    expect(readRepaymentForm(base, { ...loan, status: "Repaid", closedDate: "2026-02-01" }, [], TODAY)).toMatchObject({ ok: false, errors: { form: expect.stringContaining("Reopen") } });
    expect(readRepaymentForm({ ...base, date: "2024-09-01" }, loan, [], TODAY)).toMatchObject({ ok: false, errors: { date: expect.any(String) } });
    expect(readRepaymentForm({ ...base, date: "2026-12-01" }, loan, [], TODAY)).toMatchObject({ ok: false, errors: { date: expect.any(String) } });
  });
  it("asks for what is missing, and never offers 'Record it anyway' for a plain mistake", () => {
    const r = readRepaymentForm({}, loan, [], TODAY);
    expect(r).toMatchObject({ ok: false, errors: { kind: expect.any(String), date: expect.any(String), amount: expect.any(String) } });
    expect("overridable" in r).toBe(false);
  });
});

describe("readRepaidForm", () => {
  it("needs the day, not before the loan, not after today, and not before a repayment", () => {
    expect(readRepaidForm({}, loan, [], TODAY)).toMatchObject({ ok: false, errors: { closedDate: "Enter the day it was paid back in full" } });
    expect(readRepaidForm({ closedDate: "2024-09-01" }, loan, [], TODAY)).toMatchObject({ ok: false });
    expect(readRepaidForm({ closedDate: "2026-12-01" }, loan, [], TODAY)).toMatchObject({ ok: false });
    expect(readRepaidForm({ closedDate: "2026-01-01" }, loan, [back("r", "2026-03-01", 1000, "Interest")], TODAY)).toMatchObject({ ok: false, errors: { closedDate: expect.stringContaining("repayment") } });
    expect(readRepaidForm({ closedDate: "2026-03-01" }, loan, [back("r", "2026-03-01", 1000, "Interest")], TODAY)).toEqual({ ok: true, input: { closedDate: "2026-03-01" } });
  });
});
