export interface IngestionOutcome {
  messageId: string;
  subject: string;
  outcome: "created" | "duplicate" | "skipped";
  reason?: string;
  statementId?: string;
  cardId?: string;
  /** Anything else the import did along the way, e.g. filling in the card's last 4. */
  notes?: string[];
}

export interface IngestionResult {
  outcomes: IngestionOutcome[];
}
