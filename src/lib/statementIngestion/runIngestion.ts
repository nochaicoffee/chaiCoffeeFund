import "server-only";
import type { gmail_v1 } from "googleapis";
import { getGmailClient, getStatementLabel } from "@/lib/gmail/client";
import { downloadPdfAttachment, getMessage, getSubjectHeader, listMessagesWithLabel } from "@/lib/gmail/messages";
import { decryptAndExtractText } from "@/lib/pdf/decryptAndExtractText";
import { checkCardLast4, findCardLast4s } from "@/lib/statementParsing/extractCardLast4";
import { extractCardNameFromSubject } from "@/lib/statementParsing/extractCardNameFromSubject";
import { checkStatementBank } from "@/lib/statementParsing/issuerBank";
import { matchCard } from "@/lib/statementParsing/matchCard";
import { parseStatement } from "@/lib/statementParsing/parseStatement";
import { toStatementFields } from "@/lib/statementParsing/toStatementFields";
import { todayIso } from "@/lib/format/date";
import { cardsRepository } from "@/lib/sheets/cards";
import { statementEmailsRepository } from "@/lib/sheets/statementEmails";
import { createStatementSchema, statementsRepository } from "@/lib/sheets/statements";
import { syncRunsRepository } from "@/lib/sheets/syncRuns";
import type { Card, SyncTrigger } from "@/lib/sheets/types";
import { logEntry, planEmails } from "./emailLog";
import { decideSyncTurn } from "./syncTurn";
import { withTimeout } from "./withTimeout";
import type { IngestionOutcome, IngestionResult } from "./types";

/** A sync stops starting new emails after this long, well inside the sync route's maxDuration (60s). */
const TIME_BUDGET_MS = 45_000;
/** One email that takes longer than this is logged as failed and left for the next sync, so it can't hold up the rest. */
const EMAIL_TIMEOUT_MS = 20_000;

export interface SyncOptions {
  trigger: SyncTrigger;
  timeBudgetMs?: number;
  emailTimeoutMs?: number;
  /** The clock, for tests. */
  now?: () => Date;
}

/**
 * The one entry point both the manual "Sync statements" button and the
 * scheduled `scripts/ingestStatements.ts` reach, through
 * `/api/statements/sync`. Reads/writes repositories directly — never through
 * `lib/sheets/cached.ts`, which is `unstable_cache`/Next-runtime-bound.
 *
 * What it has done is kept in the Sheet, not on disk, so it works on a host
 * that can't write to the app's folder (#82):
 * - SyncRuns gets a row per sync. A sync adds its Running row first, and stands
 *   down if an earlier sync is still running (syncTurn.ts).
 * - StatementEmails gets a row per email read (emailLog.ts), so the next sync
 *   skips what's done and tries the failures again.
 */
export async function runStatementIngestion({ trigger, timeBudgetMs = TIME_BUDGET_MS, emailTimeoutMs = EMAIL_TIMEOUT_MS, now = () => new Date() }: SyncOptions): Promise<IngestionResult> {
  const startedAt = now();
  const run = await syncRunsRepository.create({ trigger, status: "Running", startedAt: startedAt.toISOString() });
  const turn = decideSyncTurn(await syncRunsRepository.list(), run.id, startedAt.getTime());
  if (!turn.goAhead) {
    // Best effort, like every SyncRuns write after the first: a failed write here mustn't turn into a failed sync.
    await syncRunsRepository
      .update(run.id, { status: "Skipped", finishedAt: now().toISOString(), details: `Another sync was already running, started ${turn.runningSince}` })
      .catch((error) => warn("couldn't mark this sync as skipped", error));
    return { status: "already-running", runningSince: turn.runningSince };
  }
  if (turn.stale.length > 0) {
    // A sync that died shouldn't show as Running for ever.
    await syncRunsRepository
      .updateMany(turn.stale.map((stale) => ({ id: stale.id, patch: { status: "Failed" as const, details: "Stopped before it finished, probably cut off by a time limit" } })))
      .catch((error) => warn(`couldn't mark ${turn.stale.length} stopped syncs as failed`, error));
  }

  let result: Extract<IngestionResult, { status: "done" }>;
  try {
    result = await syncEmails(startedAt.getTime(), timeBudgetMs, emailTimeoutMs, now);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await syncRunsRepository.update(run.id, { status: "Failed", finishedAt: now().toISOString(), details: message }).catch((updateError) => warn("couldn't mark this sync as failed", updateError));
    throw error;
  }
  // Its statements are saved by now, so a failure to record that is only logged. The row then shows
  // Running until it's taken as stale (syncTurn.ts), holding off other syncs until then.
  const count = (outcome: IngestionOutcome["outcome"]) => result.outcomes.filter((o) => o.outcome === outcome).length;
  await syncRunsRepository
    .update(run.id, {
      status: "Done",
      finishedAt: now().toISOString(),
      imported: count("created"),
      duplicates: count("duplicate"),
      failed: count("skipped"),
      remaining: result.remaining,
    })
    .catch((error) => warn("couldn't mark this sync as done", error));
  return result;
}

function warn(what: string, error: unknown) {
  console.warn(`[sync] ${what}:`, error instanceof Error ? error.message : error);
}

/** A statement read this sync, written to the Sheet with the others at the end, with the outcomes that point at it. */
interface NewStatement {
  input: ReturnType<typeof createStatementSchema.parse>;
  outcomes: IngestionOutcome[];
}

/**
 * Reads the emails the log says are still to do, until the time budget runs
 * out, then writes everything in a few requests: the new statements in one,
 * then the log rows. Writing per email would cost two or three requests each,
 * and a first sync of dozens of statements would hit the Sheets quota (60
 * writes a minute). If the sync dies before the end, nothing is logged, so
 * the next one simply reads those emails again: statements first, so an
 * email is never logged as imported without its statement.
 */
async function syncEmails(startedAt: number, timeBudgetMs: number, emailTimeoutMs: number, now: () => Date): Promise<Extract<IngestionResult, { status: "done" }>> {
  const gmail = getGmailClient();
  const [cardRows, statementRows, log, messageRefs] = await Promise.all([
    cardsRepository.readAll(),
    statementsRepository.readAll(),
    statementEmailsRepository.list(),
    listMessagesWithLabel(gmail, getStatementLabel()),
  ]);
  // Rows that fail validation still count as existing, so a statement whose row
  // was edited badly in the Sheet is reported as a duplicate, not imported twice.
  const statements: ExistingStatement[] = [...statementRows.records, ...statementRows.invalid.map((row) => row.values)];
  const statementIds = new Set(statements.flatMap((s) => (typeof s.id === "string" ? [s.id] : [])));

  const cards = cardRows.records;
  // Passwords come from invalid card rows too, so their statements still open
  // and are reported as matching no card, rather than as a password failure.
  const candidatePasswords = [
    ...new Set(
      [...cards.map((c) => c.statementPdfPassword), ...cardRows.invalid.map((row) => row.values.statementPdfPassword)].filter(
        (p): p is string => typeof p === "string" && p !== "",
      ),
    ),
  ];

  const planned = planEmails(
    messageRefs.map((ref) => ref.id),
    log,
    statementIds,
  );
  const newStatements: NewStatement[] = [];
  const read: { outcome: IngestionOutcome; logged: (typeof planned)[number]["logged"] }[] = [];
  for (const { messageId, logged } of planned) {
    // Always at least one, so every sync gets somewhere.
    if (read.length > 0 && now().getTime() - startedAt >= timeBudgetMs) break;
    const outcome = await withTimeout<IngestionOutcome>(
      (signal) => processMessageSafely(gmail, messageId, cards, statements, newStatements, candidatePasswords, signal),
      emailTimeoutMs,
      () => ({ messageId, subject: "", outcome: "skipped", problem: "timeout", reason: `took over ${emailTimeoutMs / 1000}s to read, so it was left for the next sync` }),
    );
    read.push({ outcome, logged });
  }

  const created = await statementsRepository.createMany(newStatements.map((s) => s.input));
  created.forEach((statement, i) => newStatements[i].outcomes.forEach((outcome) => (outcome.statementId = statement.id)));

  const triedAt = now().toISOString();
  const entries = read.map(({ outcome, logged }) => ({ logged, entry: logEntry(outcome, logged, triedAt) }));
  await statementEmailsRepository.createMany(entries.filter((e) => !e.logged).map((e) => e.entry));
  await statementEmailsRepository.updateMany(entries.flatMap((e) => (e.logged ? [{ id: e.logged.id, patch: e.entry }] : [])));

  // Only new emails count as left: failures not reached this time wait for the next sync. So a caller
  // syncing again until none are left always gets there, whatever keeps failing.
  const remaining = planned.slice(read.length).filter((email) => !email.logged).length;
  return { status: "done", outcomes: read.map((r) => r.outcome), remaining };
}

/** What the duplicate check needs from each statement row, valid or not, and from each one read this sync. */
type ExistingStatement = { id?: unknown; cardId?: unknown; statementDate?: unknown; added?: NewStatement };

async function processMessageSafely(
  gmail: gmail_v1.Gmail,
  messageId: string,
  cards: Card[],
  existingStatements: ExistingStatement[],
  newStatements: NewStatement[],
  candidatePasswords: string[],
  signal: AbortSignal,
): Promise<IngestionOutcome> {
  try {
    return await processMessage(gmail, messageId, cards, existingStatements, newStatements, candidatePasswords, signal);
  } catch (error) {
    // One bad message (network hiccup, an unexpected Sheets/zod error)
    // never aborts the whole run — it's reported and retried next time.
    return {
      messageId,
      subject: "",
      outcome: "skipped",
      problem: "error",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function processMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  cards: Card[],
  existingStatements: ExistingStatement[],
  newStatements: NewStatement[],
  candidatePasswords: string[],
  signal: AbortSignal,
): Promise<IngestionOutcome> {
  const message = await getMessage(gmail, messageId);
  const subject = getSubjectHeader(message);
  // internalDate is when Gmail received it, in milliseconds; the date is taken in the app's time zone.
  const receivedDate = message.internalDate ? todayIso(new Date(Number(message.internalDate))) : undefined;
  const email = { messageId, subject, ...(receivedDate && { receivedDate }) };
  // Matched from the subject alone, so an email whose PDF can't be opened is still reported by card (#54).
  // It's only acted on after the PDF checks, which keep their place in the order.
  const extractedCardName = extractCardNameFromSubject(subject);
  const matchResult = matchCard(extractedCardName, cards);
  const subjectCard = "card" in matchResult ? { cardId: matchResult.card.id } : {};

  const pdfBytes = await downloadPdfAttachment(gmail, message);
  if (!pdfBytes) {
    return { ...email, ...subjectCard, outcome: "skipped", problem: "no-pdf", reason: "no PDF attachment found" };
  }

  const decrypted = await decryptAndExtractText(pdfBytes, candidatePasswords);
  if ("failure" in decrypted) {
    return decrypted.failure === "no_password_matched"
      ? { ...email, ...subjectCard, outcome: "skipped", problem: "locked", reason: "none of the saved PDF passwords opens it" }
      : { ...email, ...subjectCard, outcome: "skipped", problem: "no-text", reason: "the PDF has no text to read, so it may be a scanned image" };
  }

  // The card comes first, so its statement is read by its issuer's parser,
  // not by the parser of whichever bank the PDF's text happens to name first (#92).
  if ("noMatch" in matchResult) {
    return { ...email, outcome: "skipped", problem: "no-card", reason: `no card matched "${extractedCardName}"` };
  }
  if ("ambiguous" in matchResult) {
    const names = matchResult.ambiguous.map((c) => c.name).join(", ");
    return { ...email, outcome: "skipped", problem: "several-cards", reason: `more than one card matched "${extractedCardName}": ${names}` };
  }

  const card = matchResult.card;
  const reader = checkStatementBank(card, decrypted.text);
  if ("problem" in reader) {
    return { ...email, outcome: "skipped", problem: "wrong-bank", cardId: card.id, reason: reader.problem };
  }
  const read = toStatementFields(parseStatement(decrypted.text, reader.bank));
  // Says which field was missing or misread, never its value (#89).
  if ("problem" in read) {
    // A statement whose PDF gives no due date may be in the Sheet already, added by hand: then this email is done (#54).
    const added = read.statementDate && existingStatements.find((s) => s.cardId === card.id && s.statementDate === read.statementDate);
    if (added) return duplicateOf(added, { ...email, cardId: card.id });
    return { ...email, outcome: "skipped", problem: "unreadable", cardId: card.id, reason: read.problem };
  }
  const { fields } = read;
  const statement = { statementDate: fields.statementDate, dueDate: fields.dueDate, totalAmountDue: fields.totalAmountDue };

  // The PDF's masked card number confirms the match, and fills in a card's missing last 4 (#78).
  const last4 = checkCardLast4(card, findCardLast4s(decrypted.text));
  if (last4.kind === "mismatch") {
    return {
      ...email,
      outcome: "skipped",
      problem: "card-number",
      cardId: card.id,
      reason: `the PDF shows a card ending ${last4.found.join(" or ")}, but ${card.name} ends ${card.last4}, so it's probably another card's statement. If the card was reissued with a new number, update its last 4 in Edit card`,
    };
  }
  // Given up on (withTimeout): change nothing.
  if (signal.aborted) return { ...email, outcome: "skipped", problem: "timeout", reason: "given up on" };
  const filled = last4.kind === "fill" ? await fillLast4(card, last4.last4) : null;
  const extra = { statement, ...(filled?.saved && { filledLast4: filled.last4 }), ...(filled && { notes: [filled.note] }) };

  const duplicate = existingStatements.find((s) => s.cardId === card.id && s.statementDate === fields.statementDate);
  if (duplicate) return duplicateOf(duplicate, { ...email, cardId: card.id, ...extra });

  const input = createStatementSchema.parse({
    cardId: card.id,
    statementDate: fields.statementDate,
    dueDate: fields.dueDate,
    totalAmountDue: fields.totalAmountDue,
    minimumAmountDue: fields.minimumAmountDue,
    status: "Pending",
  });
  if (signal.aborted) return { ...email, outcome: "skipped", problem: "timeout", reason: "given up on" };
  const outcome: IngestionOutcome = { ...email, outcome: "created", cardId: card.id, ...extra };
  const added: NewStatement = { input, outcomes: [outcome] };
  newStatements.push(added);
  // Counted from now on, so a second email for the same statement in this run is a duplicate too.
  existingStatements.push({ cardId: input.cardId, statementDate: input.statementDate, added });
  return outcome;
}

/** An email whose statement is already in the Sheet, or was read earlier this sync. */
function duplicateOf(existing: ExistingStatement, base: Omit<IngestionOutcome, "outcome">): IngestionOutcome {
  const outcome: IngestionOutcome = { ...base, outcome: "duplicate", statementId: typeof existing.id === "string" ? existing.id : undefined };
  // A statement read earlier this sync has no id until it's written; it gets passed on then.
  existing.added?.outcomes.push(outcome);
  return outcome;
}

/**
 * Saves a last 4 read from a statement onto its card, and onto the in-memory
 * card too, so the rest of the run checks against it. A failed save is only
 * noted: the statement itself still imports.
 */
async function fillLast4(card: Card, last4: string): Promise<{ saved: boolean; last4: string; note: string }> {
  try {
    await cardsRepository.update(card.id, { last4 });
    card.last4 = last4;
    return { saved: true, last4, note: `filled in ${card.name}'s last 4 (${last4}) from the statement` };
  } catch (error) {
    return { saved: false, last4, note: `couldn't save ${card.name}'s last 4 (${last4}): ${error instanceof Error ? error.message : String(error)}` };
  }
}
