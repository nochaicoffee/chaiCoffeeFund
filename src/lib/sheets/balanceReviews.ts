import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, isoTimestamp, nonEmptyString } from "./validation";
import { REVIEW_STATUSES, type BalanceReview } from "./types";

/**
 * A balance a bank statement disagreed with. The recorded balance stays as it is; a row here
 * is the question, Open until it's answered: Accepted writes the statement's balance, Kept
 * leaves the recorded one (lib/aggregate/statementBalances.ts, `planReviews` and `resolution`).
 */
export const createBalanceReviewSchema = z.object({
  accountId: nonEmptyString,
  date: isoDate,
  snapshotId: nonEmptyString,
  recordedBalance: z.number(),
  statementBalance: z.number(),
  messageId: nonEmptyString,
  status: z.enum(REVIEW_STATUSES),
  createdAt: isoTimestamp,
  resolvedAt: isoTimestamp.optional(),
});

/** An answer: the status and when. The rest of a review never changes. */
export const updateBalanceReviewSchema = createBalanceReviewSchema.pick({ status: true, resolvedAt: true });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const balanceReviewRowSchema = createBalanceReviewSchema.extend({ id: nonEmptyString });

export const BALANCE_REVIEW_COLUMNS: (keyof BalanceReview)[] = ["id", "accountId", "date", "snapshotId", "recordedBalance", "statementBalance", "messageId", "status", "createdAt", "resolvedAt"];

export const balanceReviewsRepository = createRepository<BalanceReview>({
  sheetName: "BalanceReviews",
  columns: BALANCE_REVIEW_COLUMNS,
  dateColumns: ["date"],
  schema: balanceReviewRowSchema,
});
