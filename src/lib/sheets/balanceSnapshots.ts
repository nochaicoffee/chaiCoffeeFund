import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString } from "./validation";
import { BALANCE_SOURCES, type BalanceSnapshot } from "./types";

export const createBalanceSnapshotSchema = z.object({
  accountId: nonEmptyString,
  date: isoDate,
  balance: z.number(),
  // Optional: a row typed in by hand has none, and reads as Manual.
  source: z.enum(BALANCE_SOURCES).optional(),
});

export const updateBalanceSnapshotSchema = createBalanceSnapshotSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const balanceSnapshotRowSchema = createBalanceSnapshotSchema.extend({ id: nonEmptyString });

/** The BalanceSnapshots tab's columns, in order. source was added on the end. */
export const BALANCE_SNAPSHOT_COLUMNS: (keyof BalanceSnapshot)[] = ["id", "accountId", "date", "balance", "source"];

export const balanceSnapshotsRepository = createRepository<BalanceSnapshot>({
  sheetName: "BalanceSnapshots",
  columns: BALANCE_SNAPSHOT_COLUMNS,
  dateColumns: ["date"],
  schema: balanceSnapshotRowSchema,
});
