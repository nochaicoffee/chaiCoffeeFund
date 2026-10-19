export type Bank = "hdfc" | "icici" | "axis" | "sbi" | "yes" | "kotak" | "amex" | "csb" | "unknown";

/**
 * Raw, string-typed extraction straight off PDF text — deliberately not yet
 * validated/typed the way a `Statement` row is. `toStatementFields.ts` does
 * that conversion (and is where an incomplete or unparseable statement
 * becomes a reason to skip it, not a bad write).
 */
export interface ParsedStatementDetails {
  bank: Bank;
  totalAmountDue?: string;
  minimumAmountDue?: string;
  dueDate?: string;
  /**
   * Why there's no due date, when the PDF says so instead of printing one:
   * HDFC's "Nil" when nothing is owed, CSB's "Immediate" (#89).
   */
  noDueDate?: "nothing owed" | "due immediately";
  statementDate?: string;
}
