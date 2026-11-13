import { isClosed } from "../aggregate/accounts";
import type { Account, AccountCurrency, Transfer } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The Add transfer form (docs/design/investments.md, "Add a transfer"): money he moved between a bank account and a Brokerage account,
 * either way. Accounts counts the bank's side only: money sent is Invested, money a broker sent back is Taken back. Plain-word errors by
 * field; the Transfers zod schema still checks the row as a last guard.
 *
 * `amount` is what left the account it left, in that account's own money; `receivedAmount` is what arrived and is asked for only when
 * the two accounts hold different money (a US broker's dollars), so dollars are never counted as rupees.
 */

export type TransferInput = Omit<Transfer, "id">;
export type TransferDirection = "out" | "back";

/** An account the form can offer, by name, with its money. */
export interface TransferAccountOption {
  id: string;
  name: string;
  currency: AccountCurrency;
  /** A closed account is offered only to the transfer already using it, so editing one never fails because its account has since closed. */
  closed?: boolean;
}

export interface TransferAccounts {
  banks: TransferAccountOption[];
  brokers: TransferAccountOption[];
}

/** His rupee banks and his Brokerage accounts, closed ones flagged. A new transfer takes only open ones; dollar banks can't take any. */
export function transferAccounts(accounts: Account[]): TransferAccounts {
  const options = (list: Account[]): TransferAccountOption[] => list.map((a) => ({ id: a.id, name: a.name, currency: a.currency ?? "INR", ...(isClosed(a) && { closed: true }) })).sort((a, b) => a.name.localeCompare(b.name));
  return {
    banks: options(accounts.filter((a) => a.accountType !== "Brokerage" && (a.currency ?? "INR") === "INR")),
    brokers: options(accounts.filter((a) => a.accountType === "Brokerage")),
  };
}

/** Which money each side of the transfer is in, for the amount's label: the first is what leaves, the second what arrives. */
export function transferMoney(direction: TransferDirection, broker: TransferAccountOption | undefined): { left: AccountCurrency; arrived: AccountCurrency } {
  const brokerMoney = broker?.currency ?? "INR";
  return direction === "out" ? { left: "INR", arrived: brokerMoney } : { left: brokerMoney, arrived: "INR" };
}

export interface TransferFormContext {
  accounts: TransferAccounts;
  /** The transfers already saved, so a broker's reference isn't recorded twice. */
  transfers: Pick<Transfer, "id" | "reference">[];
  today: string;
  /** The transfer being edited: its own reference isn't a repeat, and its own accounts are accepted even if closed. */
  editing?: Pick<Transfer, "id" | "fromAccountId" | "toAccountId">;
}

export function readTransferForm(fields: FormFields, ctx: TransferFormContext): FormResult<TransferInput> {
  const f = new FieldReader(fields);
  const direction = f.choice<TransferDirection>("direction", ["out", "back"], "Choose which way the money went");
  const usable = (a: TransferAccountOption) => !a.closed || a.id === ctx.editing?.fromAccountId || a.id === ctx.editing?.toAccountId;
  const bank = ctx.accounts.banks.find((a) => a.id === f.raw("bank").trim() && usable(a));
  if (!bank) f.fail("bank", ctx.accounts.banks.filter(usable).length === 0 ? "Add your bank account in Accounts first" : "Choose the bank account");
  const broker = ctx.accounts.brokers.find((a) => a.id === f.raw("broker").trim() && usable(a));
  if (!broker) f.fail("broker", ctx.accounts.brokers.filter(usable).length === 0 ? "Add your brokerage account in Accounts first (type Brokerage)" : "Choose the broker");

  const date = f.date("date", "Enter the date it moved");
  if (date && date > ctx.today) f.fail("date", "That day hasn't come yet");

  const money = direction ? transferMoney(direction, broker) : undefined;
  const label = money?.left === "USD" ? "amount in dollars" : "amount";
  const amount = f.amount("amount", { required: "Enter how much left", label });
  if (amount !== undefined && amount <= 0) f.fail("amount", "Enter an amount above zero");

  // The other side is asked for only when it is different money, and then it is needed: dollars at a broker are not rupees.
  const different = money !== undefined && money.left !== money.arrived;
  let receivedAmount: number | undefined;
  if (different) {
    receivedAmount = f.amount("receivedAmount", { required: money.arrived === "USD" ? "Enter how many dollars arrived" : "Enter how many rupees arrived", label: money.arrived === "USD" ? "dollars received" : "rupees received" });
    if (receivedAmount !== undefined && receivedAmount <= 0) f.fail("receivedAmount", "Enter an amount above zero");
  }

  const reference = f.text("reference");
  if (reference && ctx.transfers.some((t) => t.id !== ctx.editing?.id && t.reference?.toLowerCase() === reference.toLowerCase())) f.fail("reference", "A transfer with this reference is already recorded");

  if (!f.ok || !direction || !bank || !broker || !date || amount === undefined) return f.result(undefined as never);
  return f.result({
    date,
    fromAccountId: direction === "out" ? bank.id : broker.id,
    toAccountId: direction === "out" ? broker.id : bank.id,
    amount,
    ...(receivedAmount !== undefined && { receivedAmount }),
    ...(reference && { reference }),
    source: "Manual",
  });
}
