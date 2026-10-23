import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { count, isoDate, isoTimestamp, nonEmptyString } from "./validation";
import { STATEMENT_EMAIL_RESULTS, type AccountStatementEmail } from "./types";

/**
 * The bank account statement sync's memory: one row per statement email it has
 * looked at, so the next sync skips what's done and tries the failures again.
 * The twin of StatementEmails for cards, kept apart so the two syncs never read
 * each other's rows. Only the sync writes it, so there are no routes or update schema.
 */
export const createAccountStatementEmailSchema = z.object({
  messageId: nonEmptyString,
  receivedDate: isoDate.optional(),
  subject: nonEmptyString.optional(),
  accountId: nonEmptyString.optional(),
  periodStart: isoDate.optional(),
  periodEnd: isoDate.optional(),
  result: z.enum(STATEMENT_EMAIL_RESULTS),
  details: nonEmptyString.optional(),
  attempts: count.min(1),
  lastTriedAt: isoTimestamp,
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const accountStatementEmailRowSchema = createAccountStatementEmailSchema.extend({ id: nonEmptyString });

export const ACCOUNT_STATEMENT_EMAIL_COLUMNS: (keyof AccountStatementEmail)[] = [
  "id",
  "messageId",
  "receivedDate",
  "subject",
  "accountId",
  "periodStart",
  "periodEnd",
  "result",
  "details",
  "attempts",
  "lastTriedAt",
];

export const accountStatementEmailsRepository = createRepository<AccountStatementEmail>({
  sheetName: "AccountStatementEmails",
  columns: ACCOUNT_STATEMENT_EMAIL_COLUMNS,
  dateColumns: ["receivedDate", "periodStart", "periodEnd"],
  schema: accountStatementEmailRowSchema,
});
