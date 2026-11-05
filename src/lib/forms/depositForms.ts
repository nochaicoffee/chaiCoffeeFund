import { maturityFromTenure } from "../aggregate/fixedDeposits";
import { formatDate } from "../format/date";
import type { FixedDepositCloseKind, FixedDepositCompounding, RecurrenceCycle } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The deposit forms (#262, docs/design/fixed-income.md, FiForms): Add a deposit (as his FD app shows it: the day it started and how
 * long it runs), Edit, and Close. Each reads its fields into what the repository expects, or plain-word errors by field.
 */

export const DEPOSIT_PAYOUTS: readonly RecurrenceCycle[] = ["Monthly", "Quarterly", "Yearly"];
export const DEPOSIT_COMPOUNDING: readonly FixedDepositCompounding[] = ["Cumulative", "Non-Cumulative"];

export interface DepositInput {
  name: string;
  bankName?: string;
  principalAmount: number;
  interestRate: number;
  compoundingType: FixedDepositCompounding;
  payoutFrequency?: RecurrenceCycle;
  startDate: string;
  maturityDate: string;
  maturityAmount?: number;
  /** Where it was paid from; blank is none. On an edit "" clears it. */
  accountId: string;
}

/** The name a deposit gets when none is typed: where it is and the day it started. */
export const defaultDepositName = (bankName: string | undefined, startDate: string): string => `${bankName || "Fixed deposit"} · ${formatDate(startDate)}`;

/**
 * Add a deposit, and Edit one. How long it runs is a tenure (months and days) or, when `maturityDate` is given instead, the day it ends.
 * The bank and the maturity amount are optional: his app shows neither, so the value is estimated until the bank's own figure is entered.
 */
export function readDepositForm(fields: FormFields, known: { accountIds: string[] }, today: string): FormResult<DepositInput> {
  const f = new FieldReader(fields);
  const principalAmount = f.amount("principalAmount", { required: "Enter the amount placed", label: "amount placed" });
  if (principalAmount === 0) f.fail("principalAmount", "The amount placed has to be more than ₹0");
  const interestRate = f.amount("interestRate", { required: "Enter the rate a year", label: "rate" });
  if (interestRate !== undefined && interestRate > 30) f.fail("interestRate", "A rate is a percentage a year, like 7.75");
  const startDate = f.date("startDate", "Enter the day it started");
  if (startDate && startDate > today) f.fail("startDate", "It can't have started on a day that hasn't come yet");

  // How long it runs: the day it ends if given, otherwise a tenure.
  let maturityDate = f.date("maturityDate");
  if (!maturityDate && f.raw("maturityDate").trim() === "") {
    const monthsText = f.raw("tenureMonths").trim();
    const daysText = f.raw("tenureDays").trim();
    // Plain digits only: Number() would read "1e2" as 100 and "0x10" as 16.
    const whole = (text: string): number => (text === "" ? 0 : /^\d{1,4}$/.test(text) ? Number(text) : Number.NaN);
    const months = whole(monthsText);
    const days = whole(daysText);
    if (!Number.isInteger(months) || months > 240) f.fail("tenureMonths", "Enter the months it runs for, like 18");
    else if (!Number.isInteger(days) || days > 3650) f.fail("tenureDays", "Enter the days it runs for, like 1");
    else if (months + days === 0) f.fail("tenureMonths", "Say how long it runs: months and days, or the day it matures");
    else if (startDate) maturityDate = maturityFromTenure(startDate, months, days);
  }
  if (startDate && maturityDate && maturityDate <= startDate) f.fail("maturityDate", "It has to mature after the day it started");

  const compoundingType = f.choice("compoundingType", DEPOSIT_COMPOUNDING, "Choose whether the interest is added to it or paid out");
  let payoutFrequency: RecurrenceCycle | undefined;
  if (compoundingType === "Non-Cumulative") payoutFrequency = f.choice("payoutFrequency", DEPOSIT_PAYOUTS, "Choose how often the interest is paid out");

  const bankName = f.text("bankName");
  const maturityAmount = f.amount("maturityAmount", { label: "maturity amount" });
  if (maturityAmount !== undefined && principalAmount !== undefined && maturityAmount < principalAmount) f.fail("maturityAmount", "The maturity amount can't be less than the amount placed");
  const accountId = f.raw("accountId").trim();
  if (accountId && !known.accountIds.includes(accountId)) f.fail("accountId", "Choose one of your accounts");
  const name = f.text("name") ?? (startDate ? defaultDepositName(bankName, startDate) : "");
  return f.result({
    name,
    ...(bankName && { bankName }),
    principalAmount: principalAmount!,
    interestRate: interestRate!,
    compoundingType: compoundingType!,
    ...(payoutFrequency && { payoutFrequency }),
    startDate: startDate!,
    maturityDate: maturityDate!,
    ...(maturityAmount !== undefined && { maturityAmount }),
    accountId,
  });
}

export interface CloseInput {
  closedDate: string;
  receivedAmount: number;
  /** Worked out from the day: on or after the maturity date it matured, before it it was closed early. */
  closeKind: FixedDepositCloseKind;
}

/** Close a deposit: what reached his account and the day. How it ended follows from the day, so it can't disagree with the dates. */
export function readCloseForm(fields: FormFields, deposit: { startDate: string; maturityDate: string }, today: string): FormResult<CloseInput> {
  const f = new FieldReader(fields);
  const receivedAmount = f.amount("receivedAmount", { required: "Enter the money that reached your account", label: "amount received" });
  if (receivedAmount === 0) f.fail("receivedAmount", "The amount received has to be more than ₹0");
  const closedDate = f.date("closedDate", "Enter the day the money arrived");
  if (closedDate && closedDate > today) f.fail("closedDate", "It can't have arrived on a day that hasn't come yet");
  if (closedDate && closedDate < deposit.startDate) f.fail("closedDate", "It can't close before it started");
  return f.result({ closedDate: closedDate!, receivedAmount: receivedAmount!, closeKind: closedDate && closedDate >= deposit.maturityDate ? "Matured" : "Pre-closed" });
}
