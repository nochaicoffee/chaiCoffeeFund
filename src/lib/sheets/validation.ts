import { z } from "zod";

/** Plain YYYY-MM-DD, matching the ISO date strings this app uses everywhere (never a Date object). */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)");

export const nonNegativeNumber = z.number().min(0);

export const nonEmptyString = z.string().min(1);
