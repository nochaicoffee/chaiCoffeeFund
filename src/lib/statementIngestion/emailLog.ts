import type { StatementEmail } from "../sheets/types";
import type { IngestionOutcome } from "./types";

/** An email a sync is going to read, with its StatementEmails row if it has one. */
export interface PlannedEmail {
  messageId: string;
  logged?: StatementEmail;
}

/**
 * Which labelled emails a sync reads, going by the StatementEmails log (#82).
 * An email logged as Imported or Duplicate is done, unless its statement has
 * since been deleted from the Sheet: deleting a statement brings it back on
 * the next sync. Failed ones are tried again. Emails never seen come first,
 * newest first as Gmail lists them, so a sync that runs out of time has spent
 * it on new statements rather than on retrying old failures.
 */
export function planEmails(messageIds: string[], log: StatementEmail[], statementIds: ReadonlySet<string>): PlannedEmail[] {
  const byMessage = new Map<string, StatementEmail>();
  // The first row wins if an email was ever logged twice.
  for (const row of log) if (!byMessage.has(row.messageId)) byMessage.set(row.messageId, row);

  const fresh: PlannedEmail[] = [];
  const retry: PlannedEmail[] = [];
  for (const messageId of new Set(messageIds)) {
    const logged = byMessage.get(messageId);
    if (!logged) fresh.push({ messageId });
    else if (logged.result === "Failed" || (logged.statementId !== undefined && !statementIds.has(logged.statementId))) retry.push({ messageId, logged });
  }
  return [...fresh, ...retry];
}

const RESULTS = { created: "Imported", duplicate: "Duplicate", skipped: "Failed" } as const;

/**
 * An email's StatementEmails row after this sync read it. Every field is set,
 * blanks as undefined, so writing it over an existing row also clears what no
 * longer applies, like the reason of an email that failed last time.
 */
export function logEntry(outcome: IngestionOutcome, logged: StatementEmail | undefined, triedAt: string): Omit<StatementEmail, "id"> {
  return {
    messageId: outcome.messageId,
    // An email that couldn't be read this time keeps what an earlier sync found.
    receivedDate: outcome.receivedDate ?? logged?.receivedDate,
    subject: outcome.subject || logged?.subject,
    cardId: outcome.cardId,
    result: RESULTS[outcome.outcome],
    details: outcome.reason ?? (outcome.notes && outcome.notes.length > 0 ? outcome.notes.join("; ") : undefined),
    statementId: outcome.statementId,
    attempts: (logged?.attempts ?? 0) + 1,
    lastTriedAt: triedAt,
  };
}
