import type { IngestionOutcome, SyncProblem } from "../statementIngestion/types";

/**
 * What the Sync statements report shows (#54), built from every round's
 * outcomes: what was imported, what was already in the Sheet, and what
 * couldn't be imported with why and, where it helps, what to change.
 */

/** One email in the report: its card and statement when the sync got that far, else its subject and date. */
export interface SyncReportRow {
  messageId: string;
  card?: string;
  statementDate?: string;
  dueDate?: string;
  totalAmountDue?: number;
  subject: string;
  receivedDate?: string;
}

export interface FailedReportRow extends SyncReportRow {
  /** Why, as a sentence. */
  reason: string;
  /** What to change so the next sync imports it. Left out when the reason already says, or there's nothing to change. */
  fix?: string;
}

export interface SyncReport {
  emails: number;
  imported: SyncReportRow[];
  alreadyIn: SyncReportRow[];
  failed: FailedReportRow[];
  /** The cards whose last 4 this sync read from a statement and saved. */
  filledLast4: string[];
  /** New emails still to read, when the sync stopped before reaching them. */
  remaining: number;
}

/** "no PDF attachment found" → "No PDF attachment found." */
function sentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return trimmed;
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

/**
 * What to change for a kind of problem. Only the ones fixed in the app are here:
 * a wrong bank or card number says what to do in its own reason, and an unreadable
 * or missing PDF has nothing to change, so it's simply tried again next sync.
 */
export function fixFor(problem: SyncProblem | undefined, card: string | undefined): string | undefined {
  switch (problem) {
    case "locked":
      return card ? `Add ${card}'s statement PDF password in Edit card.` : "Add the card's statement PDF password in Edit card.";
    case "no-card":
      return "Add a word from its subject to the right card's email keywords, in Edit card.";
    case "several-cards":
      return "Make those cards' email keywords specific enough that only one matches, in Edit card.";
    default:
      return undefined;
  }
}

export function buildSyncReport(outcomes: IngestionOutcome[], remaining: number, cardNames: ReadonlyMap<string, string>): SyncReport {
  const row = (o: IngestionOutcome): SyncReportRow => ({
    messageId: o.messageId,
    ...(o.cardId && cardNames.has(o.cardId) && { card: cardNames.get(o.cardId) }),
    ...(o.statement && { statementDate: o.statement.statementDate, dueDate: o.statement.dueDate, totalAmountDue: o.statement.totalAmountDue }),
    subject: o.subject,
    ...(o.receivedDate && { receivedDate: o.receivedDate }),
  });
  const failed = outcomes
    .filter((o) => o.outcome === "skipped")
    .map((o): FailedReportRow => {
      const base = row(o);
      const fix = fixFor(o.problem, base.card);
      return { ...base, reason: sentence(o.reason ?? "it couldn't be read"), ...(fix && { fix }) };
    });
  const filledLast4 = [...new Set(outcomes.flatMap((o) => (o.filledLast4 && o.cardId && cardNames.has(o.cardId) ? [cardNames.get(o.cardId)!] : [])))];
  return {
    emails: outcomes.length,
    imported: outcomes.filter((o) => o.outcome === "created").map(row),
    alreadyIn: outcomes.filter((o) => o.outcome === "duplicate").map(row),
    failed,
    filledLast4,
    remaining,
  };
}
