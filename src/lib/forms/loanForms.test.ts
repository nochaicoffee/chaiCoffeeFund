import { describe, expect, it } from "vitest";
import { readLoanForm, readMarkPaidForm, readPrepaymentForm } from "./loanForms";

const known = { accountIds: ["hdfc", "icici"], cardIds: ["regalia"] };
// The HDFC agreement's numbers, as the Add loan form shows them.
const loan = {
  name: "Personal loan",
  lenderName: "HDFC Bank",
  category: "Personal",
  principalAmount: "11,10,000",
  annualInterestRate: "9.99",
  tenureMonths: "12",
  firstEmiDate: "2026-08-07",
  disbursementDate: "2026-07-04",
  processingFee: "7,669",
  stampDuty: "500",
  preEmiInterest: "911",
  accountId: "hdfc",
  chargedTo: "account:hdfc",
  prepaymentEffect: "Reduce-Emi",
  color: "Violet",
  prepaymentChargePercent: "4",
  prepaymentMaxPercent: "25",
  prepaymentsPerYear: "1",
  prepaymentsInLoan: "2",
  prepaymentAfterEmis: "1",
};

describe("readLoanForm", () => {
  it("reads a new loan with its charges, where the EMI leaves and the bank's prepayment rules", () => {
    expect(readLoanForm(loan, known, false)).toEqual({
      ok: true,
      input: {
        name: "Personal loan",
        lenderName: "HDFC Bank",
        category: "Personal",
        principalAmount: 1110000,
        annualInterestRate: 9.99,
        tenureMonths: 12,
        firstEmiDate: "2026-08-07",
        disbursementDate: "2026-07-04",
        processingFee: 7669,
        stampDuty: 500,
        preEmiInterest: 911,
        accountId: "hdfc",
        emiPaidFromAccountId: "hdfc",
        prepaymentEffect: "Reduce-Emi",
        color: "Violet",
        prepaymentChargePercent: 4,
        prepaymentMaxPercent: 25,
        prepaymentsPerYear: 1,
        prepaymentsInLoan: 2,
        prepaymentAfterEmis: 1,
      },
    });
  });

  it("leaves the charges and the bank's rules optional", () => {
    const r = readLoanForm({ ...loan, processingFee: "", stampDuty: "", preEmiInterest: "", chargedTo: "", prepaymentChargePercent: "", prepaymentMaxPercent: "", prepaymentsPerYear: "", prepaymentsInLoan: "", prepaymentAfterEmis: "" }, known, false);
    expect(r).toMatchObject({ ok: true, input: { processingFee: 0, stampDuty: 0, preEmiInterest: 0, prepaymentChargePercent: undefined, prepaymentsInLoan: undefined } });
    expect(r.ok && r.input.emiPaidFromAccountId).toBeFalsy();
  });

  it("says what's missing in plain words", () => {
    const r = readLoanForm({}, known, false);
    expect(r.ok ? {} : r.errors).toMatchObject({
      name: "Enter a name, like Home loan",
      lenderName: "Enter the bank, like HDFC Bank",
      principalAmount: "Enter the loan amount",
      annualInterestRate: "Enter the interest rate, like 9.99",
      tenureMonths: "Enter how many monthly EMIs, from 1 to 480",
      firstEmiDate: "Enter the first EMI's date from the sanction letter",
      accountId: "Choose the account it was paid into",
    });
  });

  it("refuses a first EMI before the loan is paid out, and charges as big as the loan", () => {
    const r = readLoanForm({ ...loan, firstEmiDate: "2026-07-01", processingFee: "11,10,000" }, known, false);
    expect(r.ok ? {} : r.errors).toEqual({ firstEmiDate: "The first EMI is due after the loan is paid out", processingFee: "The fee, stamp duty and pre-EMI interest add up to more than the loan" });
  });

  it("takes the EMI off a card as a card, never an account too", () => {
    const r = readLoanForm({ ...loan, chargedTo: "card:regalia" }, known, false);
    expect(r.ok && [r.input.emiPaidFromCardId, r.input.emiPaidFromAccountId]).toEqual(["regalia", undefined]);
  });

  it("doesn't read the terms when editing, since they drive the schedule", () => {
    const r = readLoanForm({ ...loan, principalAmount: "", tenureMonths: "", firstEmiDate: "" }, known, true);
    expect(r.ok).toBe(true);
    expect(r.ok && "principalAmount" in r.input && r.input.principalAmount !== undefined).toBe(false);
  });
});

describe("readMarkPaidForm", () => {
  const paid = { installmentId: "i20", paidDate: "2026-10-25", amountPaid: "30,000", overdueCharge: "", chargedTo: "card:regalia", effect: "Reduce-Emi", charge: "949" };
  const knownPaid = { ...known, installmentIds: ["i20"] };

  it("reads the payment, where it came from, and what any extra does", () => {
    expect(readMarkPaidForm(paid, knownPaid, "2026-10-25")).toEqual({ ok: true, input: { installmentId: "i20", paidDate: "2026-10-25", amountPaid: 30000, overdueCharge: 0, paidFromCardId: "regalia", effect: "Reduce-Emi", charge: 949 } });
  });

  it("refuses a day that hasn't come yet", () => {
    expect(readMarkPaidForm({ ...paid, paidDate: "2026-10-26" }, knownPaid, "2026-10-25")).toMatchObject({ ok: false, errors: { paidDate: "It can't be paid on a day that hasn't come yet" } });
  });
});

describe("readPrepaymentForm", () => {
  const prepay = { loanId: "pers", date: "2026-10-25", amount: "50,000", effect: "Reduce-Emi", charge: "2,360", chargedTo: "account:hdfc", bankEmi: "", bankInstallments: "" };
  const knownPrepay = { ...known, loanIds: ["pers"] };

  it("reads a prepayment, the bank's figures left out when blank", () => {
    expect(readPrepaymentForm(prepay, knownPrepay, "2026-10-25")).toEqual({ ok: true, input: { loanId: "pers", date: "2026-10-25", amount: 50000, effect: "Reduce-Emi", charge: 2360, paidFromAccountId: "hdfc" } });
  });

  it("takes the bank's EMI and number of EMIs from its letter", () => {
    expect(readPrepaymentForm({ ...prepay, bankEmi: "6,719", bankInstallments: "16" }, knownPrepay, "2026-10-25")).toMatchObject({ ok: true, input: { bankEmi: 6719, bankInstallments: 16 } });
  });

  it("doesn't need an amount to close the loan, and refuses bank figures for it", () => {
    expect(readPrepaymentForm({ ...prepay, effect: "Close", amount: "" }, knownPrepay, "2026-10-25")).toMatchObject({ ok: true, input: { effect: "Close", amount: 0 } });
    expect(readPrepaymentForm({ ...prepay, effect: "Close", bankEmi: "5000" }, knownPrepay, "2026-10-25")).toMatchObject({ ok: false, errors: { bankEmi: "A loan that's closed has no EMIs left" } });
  });

  it("needs an amount for a part-payment", () => {
    expect(readPrepaymentForm({ ...prepay, amount: "" }, knownPrepay, "2026-10-25")).toMatchObject({ ok: false, errors: { amount: "Enter the principal it pays off" } });
  });
});
