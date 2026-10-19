import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { count, isoTimestamp, nonEmptyString } from "./validation";
import { SYNC_RUN_STATUSES, SYNC_TRIGGERS, type SyncRun } from "./types";

/**
 * One row per run of the Gmail sync (#82). A sync adds its Running row first,
 * which is how two syncs started together agree that only one goes ahead
 * (lib/statementIngestion/syncTurn.ts). Only the sync writes it, so there are
 * no routes or update schema.
 */
export const createSyncRunSchema = z.object({
  trigger: z.enum(SYNC_TRIGGERS),
  status: z.enum(SYNC_RUN_STATUSES),
  startedAt: isoTimestamp,
  finishedAt: isoTimestamp.optional(),
  imported: count.optional(),
  duplicates: count.optional(),
  failed: count.optional(),
  remaining: count.optional(),
  details: nonEmptyString.optional(),
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const syncRunRowSchema = createSyncRunSchema.extend({ id: nonEmptyString });

export const syncRunsRepository = createRepository<SyncRun>({
  sheetName: "SyncRuns",
  columns: ["id", "trigger", "status", "startedAt", "finishedAt", "imported", "duplicates", "failed", "remaining", "details"],
  schema: syncRunRowSchema,
});
