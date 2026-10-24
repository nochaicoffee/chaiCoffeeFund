import type { AccountStatement } from "../aggregate/statementBalances";

/** The banks whose account statements the import reads. */
export const STATEMENT_BANKS = ["Slice", "HDFC", "Jupiter"] as const;
export type StatementBank = (typeof STATEMENT_BANKS)[number];

/** One account's statement as read from a PDF. */
export interface ParsedAccountStatement {
  bank: StatementBank;
  /** The last 4 of the account number the statement is for, when it prints one. */
  accountLast4?: string;
  statement: AccountStatement;
}

/**
 * Either a statement, or why not. A problem names what couldn't be read ("couldn't read the
 * closing balance"), never a value, since it is logged to the Sheet and shown in reports.
 */
export type ParseResult = { ok: true; parsed: ParsedAccountStatement } | { ok: false; problem: string };
