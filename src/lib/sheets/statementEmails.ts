import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { count, isoDate, isoTimestamp, nonEmptyString } from "./validation";
import { STATEMENT_EMAIL_RESULTS, type StatementEmail } from "./types";

/**
 * The Gmail sync's memory (#82): one row per statement email it has looked at,
 * so the next sync skips what's done and tries the failures again. It's in the
 * Sheet rather than a local file so it works on a host that can't write to the
 * app's folder. Only the sync writes it, so there are no routes or update schema.
 */
export const createStatementEmailSchema = z.object({
  messageId: nonEmptyString,
  receivedDate: isoDate.optional(),
  subject: nonEmptyString.optional(),
  cardId: nonEmptyString.optional(),
  result: z.enum(STATEMENT_EMAIL_RESULTS),
  details: nonEmptyString.optional(),
  statementId: nonEmptyString.optional(),
  attempts: count.min(1),
  lastTriedAt: isoTimestamp,
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const statementEmailRowSchema = createStatementEmailSchema.extend({ id: nonEmptyString });

export const statementEmailsRepository = createRepository<StatementEmail>({
  sheetName: "StatementEmails",
  columns: ["id", "messageId", "receivedDate", "subject", "cardId", "result", "details", "statementId", "attempts", "lastTriedAt"],
  dateColumns: ["receivedDate"],
  schema: statementEmailRowSchema,
});
