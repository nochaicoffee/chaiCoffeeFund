export interface IngestionOutcome {
  messageId: string;
  subject: string;
  outcome: "created" | "duplicate" | "skipped";
  reason?: string;
  statementId?: string;
  cardId?: string;
}

export interface IngestionResult {
  outcomes: IngestionOutcome[];
}
