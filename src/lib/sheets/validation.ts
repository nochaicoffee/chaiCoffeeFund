import { z } from "zod";
import { ISO_DATE_PATTERN } from "../format/date";

/** Plain YYYY-MM-DD, matching the ISO date strings this app uses everywhere (never a Date object). */
export const isoDate = z.string().regex(ISO_DATE_PATTERN, "Expected an ISO date (YYYY-MM-DD)");

export const nonNegativeNumber = z.number().min(0);

/** Greater than zero: a quantity of shares, an exchange rate, an amount placed. */
export const positiveNumber = z.number().positive();

export const nonEmptyString = z.string().min(1);

/** Paid from a card or from a bank account, never both: setting one in an update clears the other, so a row merged with it never has both. */
export function onePaidFrom<T extends { paidFromAccountId?: string; paidFromCardId?: string }>(value: T): T {
  if (value.paidFromAccountId) return { ...value, paidFromCardId: "" };
  if (value.paidFromCardId) return { ...value, paidFromAccountId: "" };
  return value;
}

/**
 * An optional field that an update can clear: "" blanks its cell, which reads back as
 * unset. JSON has no undefined, so a PATCH body can't clear a field any other way.
 */
export const clearable = <T extends z.ZodType>(schema: T) => z.union([schema, z.literal("")]);

/**
 * `clearable` for a number or an enum: "" comes out as an unset field. "" isn't a number or
 * one of an enum's values, so the plain version doesn't fit those types, and a whole-row check
 * on the merged row needs the cleared field to read as blank, not as "".
 */
export const clearableToUnset = <T extends z.ZodType>(schema: T) =>
  clearable(schema).transform((value) => (value === "" ? undefined : (value as z.output<T>)));

/** A rule across fields that a whole row must keep: where the message belongs, and when it's broken. */
export interface RowRule<T> {
  /** The field the message is about, for a form to show it beside. */
  path: string;
  message: string;
  broken: (row: T) => boolean;
}

/**
 * One list of rules, used both ways an entity needs it: `refine` for a create or row schema
 * (every broken rule, each at its field), and `check` for the repository, which runs on the
 * whole row after an update is merged over the stored one (a partial update can't see the
 * fields it leaves out) and says the first broken rule.
 */
export function rowRules<T>(rules: RowRule<T>[]) {
  return {
    check: (row: T): string | null => rules.find((rule) => rule.broken(row))?.message ?? null,
    refine: (row: T, ctx: z.RefinementCtx) => {
      for (const rule of rules) if (rule.broken(row)) ctx.addIssue({ code: "custom", path: [rule.path], message: rule.message });
    },
  };
}

/** A whole number of things: a count of rows, a number of tries. */
export const count = z.number().int().min(0);

/** A moment as `Date.toISOString()` writes it ("2026-10-19T06:15:44.787Z"). Stored as text: Sheets has no column type for one. */
export const isoTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, "Expected an ISO timestamp");
