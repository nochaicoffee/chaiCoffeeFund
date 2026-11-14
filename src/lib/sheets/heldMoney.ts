import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, positiveNumber, clearableToUnset } from "./validation";
import { HELD_DIRECTIONS, type HeldMoney } from "./types";

/**
 * Money held for someone else (docs/system-design.md, "Money held for others"): a friend's money that went into an investment with his,
 * and what he was given back. One row for each movement through one of his accounts.
 */
const heldMoneyFields = z.object({
  person: nonEmptyString,
  date: isoDate,
  direction: z.enum(HELD_DIRECTIONS),
  amount: positiveNumber,
  accountId: nonEmptyString,
  note: nonEmptyString.optional(),
});

export const createHeldMoneySchema = heldMoneyFields;

/** A partial update is merged over the stored row. A blank note clears it. */
export const updateHeldMoneySchema = heldMoneyFields.partial().extend({ note: clearableToUnset(nonEmptyString).optional() });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const heldMoneyRowSchema = heldMoneyFields.extend({ id: nonEmptyString });

/** The HeldMoney tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=HeldMoney`. */
export const HELD_MONEY_COLUMNS: (keyof HeldMoney)[] = ["id", "person", "date", "direction", "amount", "accountId", "note"];

export const heldMoneyRepository = createRepository<HeldMoney>({
  sheetName: "HeldMoney",
  columns: HELD_MONEY_COLUMNS,
  dateColumns: ["date"],
  schema: heldMoneyRowSchema,
});
