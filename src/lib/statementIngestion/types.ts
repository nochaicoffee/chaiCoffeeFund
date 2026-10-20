/**
 * Why an email was skipped, as a kind the sync report can turn into what to do
 * about it (#54). The reason says the same in words, for the StatementEmails log.
 */
export type SyncProblem =
  | "no-pdf"
  | "locked"
  | "no-text"
  | "no-card"
  | "several-cards"
  | "wrong-bank"
  | "unreadable"
  | "card-number"
  | "timeout"
  | "error";

export interface IngestionOutcome {
  messageId: string;
  subject: string;
  /** The email's date, when the email could be read. */
  receivedDate?: string;
  outcome: "created" | "duplicate" | "skipped";
  reason?: string;
  /** Set when skipped. */
  problem?: SyncProblem;
  statementId?: string;
  /** The card it matched. A skipped email has one whenever its subject names exactly one card, even if its PDF couldn't be opened. */
  cardId?: string;
  /** What was read from the PDF, when it got that far: the statement it added or matched. */
  statement?: { statementDate: string; dueDate: string; totalAmountDue: number };
  /** The last 4 saved onto its card from this statement, if the card had none (#78). */
  filledLast4?: string;
  /** Anything else the import did along the way, e.g. filling in the card's last 4. */
  notes?: string[];
}

export type IngestionResult =
  /** remaining: new emails this sync ran out of time for (#82). Failures it didn't get to retry aren't counted. */
  | { status: "done"; outcomes: IngestionOutcome[]; remaining: number }
  /** Another sync was running, so this one did nothing. */
  | { status: "already-running"; runningSince: string };
