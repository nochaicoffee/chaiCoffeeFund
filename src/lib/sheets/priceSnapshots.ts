import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, positiveNumber } from "./validation";
import { PRICE_SOURCES, type PriceSnapshot } from "./types";

/** One day's close for one ticker, saved as it was read (ADR 0013). */
const priceSnapshotFields = z.object({
  date: isoDate,
  ticker: nonEmptyString,
  close: positiveNumber,
  currency: z.enum(["INR", "USD"]),
  source: z.enum(PRICE_SOURCES),
});

export const createPriceSnapshotSchema = priceSnapshotFields;

/** A partial update, merged over the stored row. */
export const updatePriceSnapshotSchema = priceSnapshotFields.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const priceSnapshotRowSchema = priceSnapshotFields.extend({ id: nonEmptyString });

/** The PriceSnapshots tab's columns, in order. */
export const PRICE_SNAPSHOT_COLUMNS: (keyof PriceSnapshot)[] = ["id", "date", "ticker", "close", "currency", "source"];

export const priceSnapshotsRepository = createRepository<PriceSnapshot>({
  sheetName: "PriceSnapshots",
  columns: PRICE_SNAPSHOT_COLUMNS,
  dateColumns: ["date"],
  schema: priceSnapshotRowSchema,
});
