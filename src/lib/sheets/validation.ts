import { z } from "zod";
import { ISO_DATE_PATTERN } from "../format/date";

/** Plain YYYY-MM-DD, matching the ISO date strings this app uses everywhere (never a Date object). */
export const isoDate = z.string().regex(ISO_DATE_PATTERN, "Expected an ISO date (YYYY-MM-DD)");

export const nonNegativeNumber = z.number().min(0);

export const nonEmptyString = z.string().min(1);

/** A whole number of things: a count of rows, a number of tries. */
export const count = z.number().int().min(0);

/** A moment as `Date.toISOString()` writes it ("2026-10-19T06:15:44.787Z"). Stored as text: Sheets has no column type for one. */
export const isoTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, "Expected an ISO timestamp");
