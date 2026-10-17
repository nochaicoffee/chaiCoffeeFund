export interface IngestionOutcome {
  messageId: string;
  subject: string;
  /** The email's date, when the email could be read. */
  receivedDate?: string;
  outcome: "created" | "duplicate" | "skipped";
  reason?: string;
  statementId?: string;
  cardId?: string;
  /** Anything else the import did along the way, e.g. filling in the card's last 4. */
  notes?: string[];
}

export type IngestionResult =
  /** remaining: new emails this sync ran out of time for (#82). Failures it didn't get to retry aren't counted. */
  | { status: "done"; outcomes: IngestionOutcome[]; remaining: number }
  /** Another sync was running, so this one did nothing. */
  | { status: "already-running"; runningSince: string };
