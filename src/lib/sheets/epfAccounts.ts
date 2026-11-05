import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, clearableToUnset, isoDate, nonEmptyString, positiveNumber } from "./validation";
import { EPF_ACCOUNT_STATUSES, type EpfAccount } from "./types";

/**
 * An EPF account (ADR 0011): the master row that its entries and rates belong to. Only the last four of the member ID are
 * kept, to match a passbook to its account: the UAN, date of birth and the whole member ID are never stored.
 */
const epfAccountFields = z.object({
  name: nonEmptyString,
  establishment: nonEmptyString.optional(),
  memberIdLast4: z.string().regex(/^[A-Za-z0-9]{4}$/, "Enter the last four characters of the member ID").optional(),
  status: z.enum(EPF_ACCOUNT_STATUSES),
  projectionCredit: positiveNumber.optional(),
  confirmedThrough: isoDate.optional(),
});

/**
 * `confirmedThrough` is the print date of the latest imported passbook: it is set only by an import, through the repository,
 * and never by a form, so it is left out of what the routes accept.
 */
export const createEpfAccountSchema = epfAccountFields.omit({ confirmedThrough: true });

/** A partial update, merged over the stored row. "" clears an optional field. */
export const updateEpfAccountSchema = epfAccountFields
  .omit({ confirmedThrough: true })
  .partial()
  .extend({
    establishment: clearable(nonEmptyString).optional(),
    memberIdLast4: clearable(z.string().regex(/^[A-Za-z0-9]{4}$/, "Enter the last four characters of the member ID")).optional(),
    projectionCredit: clearableToUnset(positiveNumber).optional(),
  });

/** A row as read back from the Sheet: a valid create, its confirmed-through day, and its id. */
export const epfAccountRowSchema = epfAccountFields.extend({ id: nonEmptyString });

/** The EpfAccounts tab's columns, in order. */
export const EPF_ACCOUNT_COLUMNS: (keyof EpfAccount)[] = ["id", "name", "establishment", "memberIdLast4", "status", "projectionCredit", "confirmedThrough"];

export const epfAccountsRepository = createRepository<EpfAccount>({
  sheetName: "EpfAccounts",
  columns: EPF_ACCOUNT_COLUMNS,
  dateColumns: ["confirmedThrough"],
  schema: epfAccountRowSchema,
});
