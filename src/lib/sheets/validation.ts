import { z } from "zod";
import { ISO_DATE_PATTERN } from "../format/date";

/** Plain YYYY-MM-DD, matching the ISO date strings this app uses everywhere (never a Date object). */
export const isoDate = z.string().regex(ISO_DATE_PATTERN, "Expected an ISO date (YYYY-MM-DD)");

export const nonNegativeNumber = z.number().min(0);

export const nonEmptyString = z.string().min(1);
