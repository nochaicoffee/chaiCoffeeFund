import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, positiveNumber } from "./validation";
import { LENT_REPAYMENT_KINDS, type LentRepayment } from "./types";

/** Money that came back on a lent loan: principal, or the interest of a loan whose interest builds up. */
export const createLentRepaymentSchema = z.object({
  lentLoanId: nonEmptyString,
  date: isoDate,
  amount: positiveNumber,
  kind: z.enum(LENT_REPAYMENT_KINDS),
});

export const updateLentRepaymentSchema = createLentRepaymentSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const lentRepaymentRowSchema = createLentRepaymentSchema.extend({ id: nonEmptyString });

/** The LentRepayments tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=LentRepayments`. */
export const LENT_REPAYMENT_COLUMNS: (keyof LentRepayment)[] = ["id", "lentLoanId", "date", "amount", "kind"];

export const lentRepaymentsRepository = createRepository<LentRepayment>({
  sheetName: "LentRepayments",
  columns: LENT_REPAYMENT_COLUMNS,
  dateColumns: ["date"],
  schema: lentRepaymentRowSchema,
});
