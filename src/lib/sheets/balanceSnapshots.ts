import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString } from "./validation";
import type { BalanceSnapshot } from "./types";

export const createBalanceSnapshotSchema = z.object({
  accountId: nonEmptyString,
  date: isoDate,
  balance: z.number(),
});

export const updateBalanceSnapshotSchema = createBalanceSnapshotSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const balanceSnapshotRowSchema = createBalanceSnapshotSchema.extend({ id: nonEmptyString });

export const balanceSnapshotsRepository = createRepository<BalanceSnapshot>({
  sheetName: "BalanceSnapshots",
  columns: ["id", "accountId", "date", "balance"],
  dateColumns: ["date"],
  schema: balanceSnapshotRowSchema,
});
