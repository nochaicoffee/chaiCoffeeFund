import type { Account, Transfer } from "../sheets/types";
import type { LedgerTransfer } from "./ledgers";

export type NewTransfer = Omit<Transfer, "id">;

export interface TransferPlanInput {
  /** The broker's Brokerage account the ledger is for. */
  brokerId: string;
  accounts: Pick<Account, "id" | "name" | "last4" | "accountType">[];
  /** Transfers already in the Sheet: one with the same reference is not added again. */
  existing: Pick<Transfer, "reference">[];
  /** Last four digits a payout names → his account id, for an account whose last four aren't saved (or differ). */
  banksByLast4?: Record<string, string>;
  /** His account for a line that names no bank (most pay-ins). Left out, such lines wait for him to say. */
  defaultBankId?: string;
}

export interface TransferPlan {
  add: NewTransfer[];
  /** Already recorded (same reference). */
  already: number;
  /** Lines whose bank account isn't known yet: what they name, for him to answer. */
  unresolved: LedgerTransfer[];
}

/**
 * Turns a broker's ledger lines into Transfers between the broker's account and his bank account. A payout that names a bank is matched
 * by its last four digits (his saved last four, or the map he gives); anything else takes the default bank, or waits.
 */
export function planTransfers(lines: LedgerTransfer[], input: TransferPlanInput): TransferPlan {
  const known = new Set(input.existing.map((t) => t.reference).filter(Boolean));
  const byLast4 = new Map<string, string>();
  for (const a of input.accounts) if (a.last4 && a.accountType !== "Brokerage") byLast4.set(a.last4, a.id);
  for (const [last4, id] of Object.entries(input.banksByLast4 ?? {})) byLast4.set(last4, id);
  const plan: TransferPlan = { add: [], already: 0, unresolved: [] };
  for (const line of lines) {
    if (known.has(line.reference)) {
      plan.already++;
      continue;
    }
    const bankId = (line.bank && byLast4.get(line.bank.last4)) || (line.bank ? undefined : input.defaultBankId);
    if (!bankId) {
      plan.unresolved.push(line);
      continue;
    }
    const [fromAccountId, toAccountId] = line.direction === "in" ? [bankId, input.brokerId] : [input.brokerId, bankId];
    plan.add.push({ date: line.date, fromAccountId, toAccountId, amount: line.amount, reference: line.reference, source: "Statement" });
    known.add(line.reference);
  }
  return plan;
}
