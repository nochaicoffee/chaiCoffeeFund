import { compoundedValue, estimatedCurrentValue } from "@/lib/aggregate/fixedDeposits";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import type { Account, FixedDeposit } from "@/lib/sheets/types";

/** A deposit as the forms and the list see it: the stored row, what it is worth today, and whether it has matured and still isn't closed. */
export interface DepositRow extends FixedDeposit {
  /** Worth today, an estimate (a payout deposit holds its principal). A closed deposit holds nothing. */
  worth: number;
  /** What it is expected to pay when it matures: the bank's figure if entered, else the estimate (the principal for a payout deposit). */
  expectedAtMaturity: number;
  /** Not closed, and its maturity day has come: it is waiting to be closed. */
  due: boolean;
}

export interface DepositFormsData {
  today: string;
  accounts: { id: string; name: string }[];
  /** Deposits still held first (soonest to mature first), then the closed ones (latest first). */
  deposits: DepositRow[];
}

export function depositFormsData(deposits: FixedDeposit[], accounts: Account[], today: string): DepositFormsData {
  const rows = deposits.map<DepositRow>((d) => ({
    ...d,
    worth: d.status === "Closed" ? 0 : estimatedCurrentValue(d, today),
    // A payout deposit's interest is paid out along the way, so at the end the principal (or the bank's own figure) comes back.
    expectedAtMaturity: d.maturityAmount ?? (d.compoundingType === "Non-Cumulative" ? d.principalAmount : compoundedValue(d.principalAmount, d.interestRate, daysBetween(d.startDate, d.maturityDate))),
    due: d.status !== "Closed" && d.maturityDate <= today,
  }));
  const held = rows.filter((d) => d.status !== "Closed").sort((a, b) => (a.maturityDate !== b.maturityDate ? (a.maturityDate < b.maturityDate ? -1 : 1) : a.startDate !== b.startDate ? (a.startDate < b.startDate ? -1 : 1) : a.id < b.id ? -1 : 1));
  const closed = rows.filter((d) => d.status === "Closed").sort((a, b) => ((a.closedDate ?? "") !== (b.closedDate ?? "") ? ((a.closedDate ?? "") < (b.closedDate ?? "") ? 1 : -1) : a.id < b.id ? -1 : 1));
  return { today, accounts: accounts.filter((a) => a.status === "Active" && a.accountType !== "Brokerage").map((a) => ({ id: a.id, name: a.name })), deposits: [...held, ...closed] };
}
