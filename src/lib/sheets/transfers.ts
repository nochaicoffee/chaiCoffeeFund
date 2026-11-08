import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, positiveNumber, rowRules } from "./validation";
import { BALANCE_SOURCES, type Transfer } from "./types";

/**
 * Money moved between two of his own accounts (docs/system-design.md, "Transfers"). A bank to a Brokerage account is investing; the
 * other way is money taken back. The accounts are ids in the Accounts tab.
 */
const transferFields = z.object({
  date: isoDate,
  fromAccountId: nonEmptyString,
  toAccountId: nonEmptyString,
  amount: positiveNumber,
  receivedAmount: positiveNumber.optional(),
  reference: nonEmptyString.optional(),
  source: z.enum(BALANCE_SOURCES).optional(),
});

const transferRules = rowRules<Omit<Transfer, "id">>([{ path: "toAccountId", message: "A transfer goes to a different account from the one it left", broken: (row) => row.fromAccountId === row.toAccountId }]);

export const createTransferSchema = transferFields.superRefine(transferRules.refine);

/** A partial update is merged over the stored row and checked whole (the repository's `check`). */
export const updateTransferSchema = transferFields.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const transferRowSchema = transferFields.extend({ id: nonEmptyString }).superRefine(transferRules.refine);

/** The Transfers tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=Transfers`. */
export const TRANSFER_COLUMNS: (keyof Transfer)[] = ["id", "date", "fromAccountId", "toAccountId", "amount", "receivedAmount", "reference", "source"];

export const transfersRepository = createRepository<Transfer>({
  sheetName: "Transfers",
  columns: TRANSFER_COLUMNS,
  dateColumns: ["date"],
  schema: transferRowSchema,
  check: transferRules.check,
});
