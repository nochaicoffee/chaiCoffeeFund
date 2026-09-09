export type Bank = "hdfc" | "icici" | "axis" | "sbi" | "yes" | "kotak" | "amex" | "csb" | "unknown";

/**
 * Raw, string-typed extraction straight off PDF text — deliberately not yet
 * validated/typed the way a `Statement` row is. `toStatementFields.ts` does
 * that conversion (and is where an incomplete or unparseable statement
 * becomes a clean `null`, not a bad write).
 */
export interface ParsedStatementDetails {
  bank: Bank;
  totalAmountDue?: string;
  minimumAmountDue?: string;
  dueDate?: string;
  statementDate?: string;
}
