import "server-only";
import { join } from "path";
import type { gmail_v1 } from "googleapis";
import { getGmailClient, getStatementLabel } from "@/lib/gmail/client";
import { downloadPdfAttachment, getMessage, getSubjectHeader, listMessagesWithLabel } from "@/lib/gmail/messages";
import { decryptAndExtractText } from "@/lib/pdf/decryptAndExtractText";
import { checkCardLast4, findCardLast4s } from "@/lib/statementParsing/extractCardLast4";
import { extractCardNameFromSubject } from "@/lib/statementParsing/extractCardNameFromSubject";
import { matchCard } from "@/lib/statementParsing/matchCard";
import { parseStatement } from "@/lib/statementParsing/parseStatement";
import { toStatementFields } from "@/lib/statementParsing/toStatementFields";
import { cardsRepository } from "@/lib/sheets/cards";
import { createStatementSchema, statementsRepository } from "@/lib/sheets/statements";
import type { Card } from "@/lib/sheets/types";
import { isProcessed, loadProcessedMessageIds, markProcessed, saveProcessedMessageIds } from "./processedMessageIds";
import type { IngestionOutcome, IngestionResult } from "./types";

const PROCESSED_IDS_PATH = join(process.cwd(), "state", "processed-gmail-message-ids.json");

/**
 * The one entry point both the manual "Sync statements" button
 * (`/api/statements/sync`) and the scheduled `scripts/ingestStatements.ts`
 * call. Reads/writes repositories directly — never through
 * `lib/sheets/cached.ts`, which is `unstable_cache`/Next-runtime-bound and
 * unusable from a plain script.
 */
export async function runStatementIngestion(): Promise<IngestionResult> {
  const gmail = getGmailClient();
  const label = getStatementLabel();

  const [cardRows, statementRows, messageRefs, processedStore] = await Promise.all([
    cardsRepository.readAll(),
    statementsRepository.readAll(),
    listMessagesWithLabel(gmail, label),
    loadProcessedMessageIds(PROCESSED_IDS_PATH),
  ]);
  // Rows that fail validation still count as existing, so a statement whose row
  // was edited badly in the Sheet is reported as a duplicate, not imported twice.
  const statements: ExistingStatement[] = [...statementRows.records, ...statementRows.invalid.map((row) => row.values)];

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
  const pending = messageRefs.filter((ref) => !isProcessed(processedStore, ref.id));

  const outcomes: IngestionOutcome[] = [];
  let store = processedStore;

  for (const ref of pending) {
    const outcome = await processMessageSafely(gmail, ref.id, cards, statements, candidatePasswords);
    outcomes.push(outcome);
    // Only cache a terminal, resolved outcome — a failure (no PDF, bad
    // password, incomplete parse, no/ambiguous card match) is retried and
    // logged loudly on every future run until the user fixes the root
    // cause, rather than silently going stale.
    if (outcome.outcome === "created" || outcome.outcome === "duplicate") {
      store = markProcessed(store, ref.id);
    }
  }

  await saveProcessedMessageIds(PROCESSED_IDS_PATH, store);
  return { outcomes };
}

/** What the duplicate check needs from each statement row, valid or not. */
type ExistingStatement = { id?: unknown; cardId?: unknown; statementDate?: unknown };

async function processMessageSafely(
  gmail: gmail_v1.Gmail,
  messageId: string,
  cards: Card[],
  existingStatements: ExistingStatement[],
  candidatePasswords: string[],
): Promise<IngestionOutcome> {
  try {
    return await processMessage(gmail, messageId, cards, existingStatements, candidatePasswords);
  } catch (error) {
    // One bad message (network hiccup, an unexpected Sheets/zod error)
    // never aborts the whole run — it's reported and retried next time.
    return {
      messageId,
      subject: "",
      outcome: "skipped",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function processMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  cards: Card[],
  existingStatements: ExistingStatement[],
  candidatePasswords: string[],
): Promise<IngestionOutcome> {
  const message = await getMessage(gmail, messageId);
  const subject = getSubjectHeader(message);

  const pdfBytes = await downloadPdfAttachment(gmail, message);
  if (!pdfBytes) {
    return { messageId, subject, outcome: "skipped", reason: "no PDF attachment found" };
  }

  const decrypted = await decryptAndExtractText(pdfBytes, candidatePasswords);
  if ("failure" in decrypted) {
    return { messageId, subject, outcome: "skipped", reason: decrypted.failure };
  }

  const parsed = parseStatement(decrypted.text);
  const fields = toStatementFields(parsed);
  if (!fields) {
    return { messageId, subject, outcome: "skipped", reason: "incomplete or unparseable statement fields" };
  }

  const extractedCardName = extractCardNameFromSubject(subject);
  const matchResult = matchCard(extractedCardName, cards);
  if ("noMatch" in matchResult) {
    return { messageId, subject, outcome: "skipped", reason: `no card matched "${extractedCardName}"` };
  }
  if ("ambiguous" in matchResult) {
    const ids = matchResult.ambiguous.map((c) => c.id).join(", ");
    return {
      messageId,
      subject,
      outcome: "skipped",
      reason: `ambiguous card match for "${extractedCardName}" (candidates: ${ids})`,
    };
  }

  const card = matchResult.card;
  // The PDF's masked card number confirms the match, and fills in a card's missing last 4 (#78).
  const last4 = checkCardLast4(card, findCardLast4s(decrypted.text));
  if (last4.kind === "mismatch") {
    return {
      messageId,
      subject,
      outcome: "skipped",
      cardId: card.id,
      reason: `the PDF shows a card ending ${last4.found.join(" or ")}, but ${card.name} ends ${card.last4}, so it's probably another card's statement. If the card was reissued with a new number, update its last 4 in the Cards tab`,
    };
  }
  const notes = last4.kind === "fill" ? [await fillLast4(card, last4.last4)] : [];

  const duplicate = existingStatements.find((s) => s.cardId === card.id && s.statementDate === fields.statementDate);
  if (duplicate) {
    return {
      messageId,
      subject,
      outcome: "duplicate",
      statementId: typeof duplicate.id === "string" ? duplicate.id : undefined,
      cardId: card.id,
      ...(notes.length > 0 && { notes }),
    };
  }

  const input = createStatementSchema.parse({
    cardId: card.id,
    statementDate: fields.statementDate,
    dueDate: fields.dueDate,
    totalAmountDue: fields.totalAmountDue,
    minimumAmountDue: fields.minimumAmountDue,
    status: "Pending",
  });
  const created = await statementsRepository.create(input);
  // Counted from now on, so a second email for the same statement in this run is a duplicate too.
  existingStatements.push(created);

  return { messageId, subject, outcome: "created", statementId: created.id, cardId: card.id, ...(notes.length > 0 && { notes }) };
}

/**
 * Saves a last 4 read from a statement onto its card, and onto the in-memory
 * card too, so the rest of the run checks against it. A failed save is only
 * noted: the statement itself still imports.
 */
async function fillLast4(card: Card, last4: string): Promise<string> {
  try {
    await cardsRepository.update(card.id, { last4 });
    card.last4 = last4;
    return `filled in ${card.name}'s last 4 (${last4}) from the statement`;
  } catch (error) {
    return `couldn't save ${card.name}'s last 4 (${last4}): ${error instanceof Error ? error.message : String(error)}`;
  }
}
