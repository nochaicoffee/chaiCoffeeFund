import { CARD_COLORS, type AccountPurpose, type AccountType, type CardColor } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The Accounts forms (#165, docs/design/accounts.md "Forms"): Add and Edit account, Update
 * balance, the monthly check-in, and editing one balance. Each one's fields read into what its
 * repository expects, or plain-word errors by field. The wording here is the source of truth.
 */

export const ACCOUNT_TYPES: readonly AccountType[] = ["Savings", "Current"];
export const ACCOUNT_PURPOSES: readonly AccountPurpose[] = ["Spending", "Investment", "Emergency-Fund", "Loan-Payments"];

export interface AccountInput {
  name: string;
  bank: string;
  accountType: AccountType;
  purpose: AccountPurpose;
  startDate: string;
  color: CardColor;
  /** Blank is none; on an edit "" clears it. */
  last4: string;
  /** Kept exactly as typed. Blank is absent, which Edit account treats as "keep the saved one". */
  statementPdfPassword?: string;
  /** Add only: today's balance, saved as its first one. */
  balance?: number;
}

/** Add account, and Edit account when `editing` (which has no first balance). */
export function readAccountForm(fields: FormFields, editing: boolean): FormResult<AccountInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Enter the account's name");
  const bank = f.text("bank", "Enter the bank");
  const accountType = f.choice("accountType", ACCOUNT_TYPES, "Choose savings or current");
  const purpose = f.choice("purpose", ACCOUNT_PURPOSES, "Choose what it's for");
  const startDate = f.date("startDate", "Enter when it was opened");
  const color = f.choice("color", CARD_COLORS, "Pick a colour");
  const last4 = f.text("last4") ?? "";
  if (last4 && !/^\d{4}$/.test(last4)) f.fail("last4", "Enter just the last 4 digits, like 4821");
  const password = f.raw("statementPdfPassword");
  const balance = editing ? undefined : f.amount("balance", { label: "balance", allowNegative: false });
  return f.result({
    name: name!,
    bank: bank!,
    accountType: accountType!,
    purpose: purpose!,
    startDate: startDate!,
    color: color!,
    last4,
    ...(password.trim() !== "" && { statementPdfPassword: password }),
    ...(balance !== undefined && { balance }),
  });
}

export interface BalanceInput {
  accountId: string;
  date: string;
  balance: number;
}

/** Update balance: a balance for an account on a day (an overdrawn account's can be negative). */
export function readBalanceForm(fields: FormFields, known: { accountIds: string[] }, today: string): FormResult<BalanceInput> {
  const f = new FieldReader(fields);
  const accountId = f.choice("accountId", known.accountIds, "Choose the account");
  const date = f.date("date", "Enter the day it was read");
  if (date && date > today) f.fail("date", "A balance can't be from a day that hasn't come yet");
  const balance = f.amount("balance", { required: "Enter what it holds", label: "balance", allowNegative: true });
  return f.result({ accountId: accountId!, date: date!, balance: balance! });
}

/** Editing one balance: its day and amount; the account stays. */
export function readEditBalanceForm(fields: FormFields, today: string): FormResult<{ id: string; date: string; balance: number }> {
  const f = new FieldReader(fields);
  const id = f.text("id", "This balance isn't in the Sheet any more");
  const date = f.date("date", "Enter the day it was read");
  if (date && date > today) f.fail("date", "A balance can't be from a day that hasn't come yet");
  const balance = f.amount("balance", { required: "Enter what it holds", label: "balance", allowNegative: true });
  return f.result({ id: id!, date: date!, balance: balance! });
}

/** The monthly check-in: one day, and a balance for each account typed in (blank ones are left alone). */
export function readCheckInForm(fields: FormFields, known: { accountIds: string[] }, today: string): FormResult<{ date: string; balances: { accountId: string; balance: number }[] }> {
  const f = new FieldReader(fields);
  const date = f.date("date", "Enter the day these were read");
  if (date && date > today) f.fail("date", "A balance can't be from a day that hasn't come yet");
  const balances: { accountId: string; balance: number }[] = [];
  for (const accountId of known.accountIds) {
    const value = f.amount(`balance:${accountId}`, { label: "balance", allowNegative: true });
    if (value !== undefined) balances.push({ accountId, balance: value });
  }
  if (f.ok && balances.length === 0) f.fail("form", "Type at least one balance");
  return f.result({ date: date!, balances });
}

/** Close account: the day it closed. Not in the future, and not before its latest balance, which would leave it still holding money. */
export function readCloseForm(fields: FormFields, latestBalanceDate: string | null, today: string): FormResult<{ endDate: string }> {
  const f = new FieldReader(fields);
  const endDate = f.date("endDate", "Enter the day it was closed");
  if (endDate && endDate > today) f.fail("endDate", "It can't be closed on a day that hasn't come yet");
  if (endDate && latestBalanceDate && endDate < latestBalanceDate) f.fail("endDate", "It has a balance after that day. Close it on or after its latest balance, or delete that balance first");
  return f.result({ endDate: endDate! });
}
