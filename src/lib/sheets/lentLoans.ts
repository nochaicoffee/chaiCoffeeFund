import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearableToUnset, isoDate, nonEmptyString, nonNegativeNumber, positiveNumber, rowRules } from "./validation";
import { CARD_COLORS, LENT_INTEREST_MODES, LENT_LOAN_STATUSES, type LentLoan } from "./types";

/** Money lent to a person, outside any bank. The Sheet's dropdown text is exactly these literals. */
const lentLoanFields = z.object({
  borrowerName: nonEmptyString,
  principalAmount: positiveNumber,
  startDate: isoDate,
  interestMode: z.enum(LENT_INTEREST_MODES),
  interestRate: nonNegativeNumber.optional(),
  payoutFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  payoutAmount: positiveNumber.optional(),
  status: z.enum(LENT_LOAN_STATUSES),
  closedDate: isoDate.optional(),
  // Added on the end for the Lent page (docs/design/lent-out.md, A1).
  incomeSourceId: nonEmptyString.optional(),
  color: z.enum(CARD_COLORS).optional(),
});

const lentLoanRules = rowRules<Omit<LentLoan, "id">>([
  { path: "interestRate", message: "Say the yearly interest rate of a loan whose interest builds up", broken: (row) => row.interestMode === "Accruing" && row.interestRate === undefined },
  { path: "payoutFrequency", message: "Say how often a paid-out loan pays", broken: (row) => row.interestMode === "Paid-out" && row.payoutFrequency === undefined },
  { path: "payoutAmount", message: "Say how much a paid-out loan pays each time", broken: (row) => row.interestMode === "Paid-out" && row.payoutAmount === undefined },
  { path: "payoutAmount", message: "A loan whose interest builds up has no payout amount", broken: (row) => row.interestMode === "Accruing" && row.payoutAmount !== undefined },
  { path: "payoutFrequency", message: "A loan whose interest builds up has no payout frequency", broken: (row) => row.interestMode === "Accruing" && row.payoutFrequency !== undefined },
  { path: "interestRate", message: "A paid-out loan's rate is worked out from what it pays, so it has none of its own", broken: (row) => row.interestMode === "Paid-out" && row.interestRate !== undefined },
  { path: "incomeSourceId", message: "Only a paid-out loan has an income source: a loan whose interest builds up is paid with the principal", broken: (row) => row.interestMode === "Accruing" && row.incomeSourceId !== undefined },
  { path: "closedDate", message: "Say the day a repaid loan was paid back in full", broken: (row) => row.status === "Repaid" && !row.closedDate },
  // ISO dates sort as text, so this is a date comparison.
  { path: "closedDate", message: "The closing day can't be before the day it was lent", broken: (row) => Boolean(row.closedDate) && (row.closedDate as string) < row.startDate },
  { path: "closedDate", message: "Only a repaid loan has a closing day", broken: (row) => row.status !== "Repaid" && Boolean(row.closedDate) },
]);

export const createLentLoanSchema = lentLoanFields.superRefine(lentLoanRules.refine);

/** An update can clear what a mode change leaves behind ("" blanks the cell, see `clearableToUnset`). */
export const updateLentLoanSchema = lentLoanFields
  .partial()
  .extend({
    interestRate: clearableToUnset(nonNegativeNumber).optional(),
    payoutFrequency: clearableToUnset(z.enum(["Monthly", "Quarterly", "Yearly"])).optional(),
    payoutAmount: clearableToUnset(positiveNumber).optional(),
    closedDate: clearableToUnset(isoDate).optional(),
    incomeSourceId: clearableToUnset(nonEmptyString).optional(),
    color: clearableToUnset(z.enum(CARD_COLORS)).optional(),
  });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const lentLoanRowSchema = lentLoanFields.extend({ id: nonEmptyString }).superRefine(lentLoanRules.refine);

/** The LentLoans tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=LentLoans`. */
export const LENT_LOAN_COLUMNS: (keyof LentLoan)[] = [
  "id", "borrowerName", "principalAmount", "startDate", "interestMode", "interestRate", "payoutFrequency", "payoutAmount", "status", "closedDate",
  "incomeSourceId", "color",
];

export const lentLoansRepository = createRepository<LentLoan>({
  sheetName: "LentLoans",
  columns: LENT_LOAN_COLUMNS,
  dateColumns: ["startDate", "closedDate"],
  schema: lentLoanRowSchema,
  check: lentLoanRules.check,
});
