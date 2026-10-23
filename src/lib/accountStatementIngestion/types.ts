import type { MismatchAction } from "../aggregate/statementBalances";
import type { StatementBank } from "../accountStatementParsing/types";

/**
 * Why a statement, or a whole email, wasn't used, as a kind the report can say what to do about.
 * The reason says the same in words for the log, and names fields and dates, never amounts.
 */
export type AccountSyncProblem =
  | "no-pdf"
  | "locked"
  | "no-text"
  | "unknown-layout"
  | "unreadable"
  | "numbers"
  | "no-account"
  | "several-accounts"
  | "closed-account"
  | "period-in-future"
  | "before-account-opened"
  | "timeout"
  | "error";

/** A balance a statement disagreed with, left as recorded and waiting for an answer. */
export interface OpenedReview {
  date: string;
  recordedBalance: number;
  statementBalance: number;
  /** The statement's balance is more than a fifth below the one before it. */
  bigDrop: boolean;
}

/** What one statement (one account's, in a PDF that may hold several) did. */
export interface StatementOutcome {
  result: "imported" | "unchanged" | "skipped";
  problem?: AccountSyncProblem;
  reason?: string;
  accountId?: string;
  accountName?: string;
  bank?: StatementBank;
  periodStart?: string;
  periodEnd?: string;
  /** Balances written. */
  created: number;
  /** Balances the Sheet already had, to the paisa. */
  unchanged: number;
  reviews: OpenedReview[];
  /** Anything else the import did, like filling in the account's last 4. */
  notes: string[];
}

/** What one email did: its statements', and one result for the log. */
export interface EmailOutcome {
  messageId: string;
  subject: string;
  receivedDate?: string;
  result: "imported" | "unchanged" | "skipped";
  problem?: AccountSyncProblem;
  reason?: string;
  statements: StatementOutcome[];
}

export type AccountSyncResult =
  /** remaining: new emails this sync ran out of time for. */
  | { status: "done"; outcomes: EmailOutcome[]; remaining: number; dryRun: boolean }
  /** Another account sync was running, so this one did nothing. */
  | { status: "already-running"; runningSince: string };

/** What writing a planned statement means for the Sheet. */
export interface StatementWrites {
  creates: { date: string; balance: number }[];
  /** Mismatches that need a new review row. */
  reviews: MismatchAction[];
  /** Open reviews a corrected statement replaces. */
  supersede: string[];
  fillLast4?: { accountId: string; last4: string };
}
