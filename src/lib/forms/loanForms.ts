import { CARD_COLORS, LOAN_PREPAYMENT_EFFECTS, type CardColor, type LoanCategory, type LoanPrepaymentEffect, type PrepaymentEffect } from "../sheets/types";
import { FieldReader, readPaidFrom, type FormFields, type FormResult } from "./fields";

/**
 * The Loans forms (docs/design/loans.md, LoansForms): Add and Edit loan, Mark paid, and Add prepayment. Each one's
 * fields read into what its action writes, or plain-word errors by field. The wording here is the source of truth.
 * The bank's limits on a prepayment are warnings in the form, never errors here: the app records what happened.
 */

export const LOAN_CATEGORIES: readonly LoanCategory[] = ["Home", "Auto", "Personal", "Other"];
export const PREPAYMENT_EFFECTS: readonly PrepaymentEffect[] = [...LOAN_PREPAYMENT_EFFECTS, "Close"];

interface Known {
  accountIds: string[];
  cardIds: string[];
}

export interface LoanInput {
  name: string;
  lenderName: string;
  category: LoanCategory;
  principalAmount: number;
  annualInterestRate: number;
  tenureMonths: number;
  firstEmiDate: string;
  disbursementDate: string;
  processingFee: number;
  stampDuty: number;
  preEmiInterest: number;
  accountId: string;
  emiPaidFromAccountId?: string;
  emiPaidFromCardId?: string;
  prepaymentEffect: LoanPrepaymentEffect;
  color: CardColor;
  /** Blank is none (undefined). */
  prepaymentChargePercent?: number;
  prepaymentMaxPercent?: number;
  prepaymentsPerYear?: number;
  prepaymentsInLoan?: number;
  prepaymentAfterEmis?: number;
}

/** A blank-able whole number: undefined when blank, else between min and max. */
function optionalInteger(f: FieldReader, name: string, min: number, max: number, message: string): number | undefined {
  return f.raw(name).trim() === "" ? undefined : f.integer(name, { min, max, message });
}

/**
 * Add loan, and Edit loan when `editing`: an edit can't change the terms that drive the schedule (the amount, rate,
 * number of EMIs and the two dates), so it doesn't read them.
 */
export function readLoanForm(fields: FormFields, known: Known, editing: boolean): FormResult<Omit<LoanInput, "principalAmount" | "annualInterestRate" | "tenureMonths" | "firstEmiDate" | "disbursementDate"> & Partial<LoanInput>> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Enter a name, like Home loan");
  const lenderName = f.text("lenderName", "Enter the bank, like HDFC Bank");
  const category = f.choice("category", LOAN_CATEGORIES, "Choose home, car, personal or other");
  let terms: Pick<LoanInput, "principalAmount" | "annualInterestRate" | "tenureMonths" | "firstEmiDate" | "disbursementDate"> | undefined;
  if (!editing) {
    const principalAmount = f.amount("principalAmount", { required: "Enter the loan amount", label: "loan amount" });
    if (principalAmount === 0) f.fail("principalAmount", "The loan amount has to be more than ₹0");
    const rateText = f.raw("annualInterestRate").trim().replace(/%$/, "");
    const annualInterestRate = Number(rateText);
    if (rateText === "" || !Number.isFinite(annualInterestRate) || annualInterestRate < 0 || annualInterestRate > 60) f.fail("annualInterestRate", rateText === "" ? "Enter the interest rate, like 9.99" : "Enter the rate a year as a number, like 9.99");
    const tenureMonths = f.integer("tenureMonths", { min: 1, max: 480, message: "Enter how many monthly EMIs, from 1 to 480" });
    const disbursementDate = f.date("disbursementDate", "Enter the day the loan was paid out");
    const firstEmiDate = f.date("firstEmiDate", "Enter the first EMI's date from the sanction letter");
    if (firstEmiDate && disbursementDate && firstEmiDate <= disbursementDate) f.fail("firstEmiDate", "The first EMI is due after the loan is paid out");
    terms = { principalAmount: principalAmount!, annualInterestRate, tenureMonths: tenureMonths!, firstEmiDate: firstEmiDate!, disbursementDate: disbursementDate! };
  }
  const processingFee = f.amount("processingFee", { label: "processing fee" }) ?? 0;
  const stampDuty = f.amount("stampDuty", { label: "stamp duty" }) ?? 0;
  const preEmiInterest = f.amount("preEmiInterest", { label: "pre-EMI interest" }) ?? 0;
  if (terms?.principalAmount && processingFee + stampDuty + preEmiInterest >= terms.principalAmount) f.fail("processingFee", "The fee, stamp duty and pre-EMI interest add up to more than the loan");
  const accountId = f.choice("accountId", known.accountIds, "Choose the account it was paid into");
  const paidFrom = readPaidFrom(f, "chargedTo", known);
  const prepaymentEffect = f.choice("prepaymentEffect", LOAN_PREPAYMENT_EFFECTS, "Choose what a prepayment usually does");
  const color = f.choice("color", CARD_COLORS, "Pick a colour");
  const chargeText = f.raw("prepaymentChargePercent").trim().replace(/%$/, "");
  const charge = chargeText === "" ? undefined : Number(chargeText);
  if (charge !== undefined && (!Number.isFinite(charge) || charge < 0 || charge > 20)) f.fail("prepaymentChargePercent", "Enter the charge as a percentage, like 4");
  const maxText = f.raw("prepaymentMaxPercent").trim().replace(/%$/, "");
  const most = maxText === "" ? undefined : Number(maxText);
  if (most !== undefined && (!Number.isFinite(most) || most <= 0 || most > 100)) f.fail("prepaymentMaxPercent", "Enter a percentage from 1 to 100, like 25");
  const perYear = optionalInteger(f, "prepaymentsPerYear", 1, 12, "Enter how many a year, from 1 to 12");
  const inLoan = optionalInteger(f, "prepaymentsInLoan", 1, 100, "Enter how many in all, like 2");
  const afterEmis = optionalInteger(f, "prepaymentAfterEmis", 0, 480, "Enter how many EMIs first, like 1");
  return f.result({
    name: name!,
    lenderName: lenderName!,
    category: category!,
    ...terms,
    processingFee,
    stampDuty,
    preEmiInterest,
    accountId: accountId!,
    ...(paidFrom.paidFromAccountId && { emiPaidFromAccountId: paidFrom.paidFromAccountId }),
    ...(paidFrom.paidFromCardId && { emiPaidFromCardId: paidFrom.paidFromCardId }),
    prepaymentEffect: prepaymentEffect!,
    color: color!,
    prepaymentChargePercent: charge,
    prepaymentMaxPercent: most,
    prepaymentsPerYear: perYear,
    prepaymentsInLoan: inLoan,
    prepaymentAfterEmis: afterEmis,
  });
}

export interface MarkPaidInput {
  installmentId: string;
  paidDate: string;
  amountPaid: number;
  overdueCharge: number;
  paidFromAccountId?: string;
  paidFromCardId?: string;
  /** What the part above the EMI does, when there is one. */
  effect: LoanPrepaymentEffect;
  /** The bank's charge on that part. */
  charge: number;
}

/** Mark paid: an EMI, with anything paid above it (and its overdue charge) becoming a prepayment. */
export function readMarkPaidForm(fields: FormFields, known: Known & { installmentIds: string[] }, today: string): FormResult<MarkPaidInput> {
  const f = new FieldReader(fields);
  const installmentId = f.choice("installmentId", known.installmentIds, "Choose the EMI it paid");
  const paidDate = f.date("paidDate", "Enter the day it was paid");
  if (paidDate && paidDate > today) f.fail("paidDate", "It can't be paid on a day that hasn't come yet");
  const amountPaid = f.amount("amountPaid", { required: "Enter how much was paid", label: "amount paid" });
  if (amountPaid === 0) f.fail("amountPaid", "The amount has to be more than ₹0");
  const overdueCharge = f.amount("overdueCharge", { label: "overdue charge" }) ?? 0;
  const paidFrom = readPaidFrom(f, "chargedTo", known);
  const effect = f.raw("effect").trim() === "" ? "Reduce-Tenure" : f.choice("effect", LOAN_PREPAYMENT_EFFECTS, "Choose what the extra does");
  const charge = f.amount("charge", { label: "prepayment charge" }) ?? 0;
  return f.result({ installmentId: installmentId!, paidDate: paidDate!, amountPaid: amountPaid!, overdueCharge, ...paidFrom, effect: effect!, charge });
}

export interface PrepaymentInput {
  loanId: string;
  date: string;
  amount: number;
  effect: PrepaymentEffect;
  charge: number;
  paidFromAccountId?: string;
  paidFromCardId?: string;
  bankEmi?: number;
  bankInstallments?: number;
}

/** Add prepayment. For Close the amount is whatever's left, so it isn't asked for. */
export function readPrepaymentForm(fields: FormFields, known: Known & { loanIds: string[] }, today: string): FormResult<PrepaymentInput> {
  const f = new FieldReader(fields);
  const loanId = f.choice("loanId", known.loanIds, "Choose the loan");
  const date = f.date("date", "Enter the day it was paid");
  if (date && date > today) f.fail("date", "It can't be paid on a day that hasn't come yet. Try it in What if first");
  const effect = f.choice("effect", PREPAYMENT_EFFECTS, "Choose what it does");
  const amount = effect === "Close" ? (f.amount("amount", { label: "amount" }) ?? 0) : f.amount("amount", { required: "Enter the principal it pays off", label: "amount" });
  if (effect !== "Close" && amount === 0) f.fail("amount", "The amount has to be more than ₹0");
  const charge = f.amount("charge", { label: "charge" }) ?? 0;
  const paidFrom = readPaidFrom(f, "chargedTo", known);
  const bankEmi = f.amount("bankEmi", { label: "bank's EMI" });
  if (bankEmi === 0) f.fail("bankEmi", "Leave it blank, or enter the EMI from the bank's letter");
  const bankInstallments = f.raw("bankInstallments").trim() === "" ? undefined : f.integer("bankInstallments", { min: 1, max: 480, message: "Enter how many EMIs are left, from the bank's letter" });
  if (effect === "Close" && (bankEmi || bankInstallments)) f.fail("bankEmi", "A loan that's closed has no EMIs left");
  return f.result({ loanId: loanId!, date: date!, amount: amount!, effect: effect!, charge, ...paidFrom, ...(bankEmi && { bankEmi }), ...(bankInstallments && { bankInstallments }) });
}
