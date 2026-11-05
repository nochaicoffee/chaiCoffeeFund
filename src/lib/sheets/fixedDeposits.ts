import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, clearableToUnset, isoDate, nonEmptyString, nonNegativeNumber, positiveNumber, rowRules } from "./validation";
import { FIXED_DEPOSIT_CLOSE_KINDS, type FixedDeposit } from "./types";

/**
 * A deposit's fields. `status` is Active, Matured or Closed; Matured is the deposit's state once its term has run out and is better
 * derived from the maturity date than stored (system-design.md), so it is kept only for the rows that already say it. `closeKind` is a
 * different thing: how a CLOSED deposit ended, Matured (its term ran out) or Pre-closed (early), as his FD app's tabs name them.
 *
 * Also: The repository reads column types from a plain object, so the rules across fields are added below. */
const fixedDepositFields = z.object({
  name: nonEmptyString,
  bankName: nonEmptyString.optional(),
  principalAmount: positiveNumber,
  interestRate: nonNegativeNumber,
  compoundingType: z.enum(["Cumulative", "Non-Cumulative"]),
  payoutFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  startDate: isoDate,
  maturityDate: isoDate,
  maturityAmount: nonNegativeNumber.optional(),
  accountId: nonEmptyString.optional(),
  status: z.enum(["Active", "Matured", "Closed"]),
  closedDate: isoDate.optional(),
  // What reached his account: a closed deposit that paid nothing is almost certainly a missing number, so it must be above zero.
  receivedAmount: positiveNumber.optional(),
  closeKind: z.enum(FIXED_DEPOSIT_CLOSE_KINDS).optional(),
});

const depositRules = rowRules<Omit<FixedDeposit, "id">>([
  {
    // ISO dates sort as text, so this is a date comparison.
    path: "maturityDate",
    message: "The maturity date must be after the start date",
    broken: (row) => row.maturityDate <= row.startDate,
  },
  {
    path: "maturityAmount",
    message: "The maturity amount can't be less than the amount placed",
    // An unset maturity amount is fine: it is estimated until he enters the bank's.
    broken: (row) => row.maturityAmount !== undefined && row.maturityAmount < row.principalAmount,
  },
  {
    path: "payoutFrequency",
    message: "Say how often a non-cumulative deposit pays out its interest",
    broken: (row) => row.compoundingType === "Non-Cumulative" && row.payoutFrequency === undefined,
  },
  {
    path: "payoutFrequency",
    message: "A cumulative deposit reinvests its interest, so it has no payout frequency",
    broken: (row) => row.compoundingType === "Cumulative" && row.payoutFrequency !== undefined,
  },
  // What a closed deposit records. A deposit that isn't closed has none of it. A text or date is "" in a merged row, so those are read by truthiness.
  {
    path: "closedDate",
    message: "Only a closed deposit has a closing day",
    broken: (row) => row.status !== "Closed" && Boolean(row.closedDate),
  },
  {
    path: "receivedAmount",
    message: "Only a closed deposit has an amount received",
    broken: (row) => row.status !== "Closed" && row.receivedAmount !== undefined,
  },
  {
    path: "closeKind",
    message: "Only a closed deposit has a way it closed",
    broken: (row) => row.status !== "Closed" && row.closeKind !== undefined,
  },
  {
    path: "closedDate",
    message: "A deposit can't close before it started",
    broken: (row) => Boolean(row.closedDate) && row.closedDate! < row.startDate,
  },
  // How it ended must agree with the dates. ISO dates sort as text, so these are date comparisons.
  {
    path: "closeKind",
    message: "A deposit that closed before its maturity date was closed early: choose Pre-closed",
    broken: (row) => row.closeKind === "Matured" && Boolean(row.closedDate) && row.closedDate! < row.maturityDate,
  },
  {
    path: "closeKind",
    message: "A deposit that closed on or after its maturity date matured: choose Matured",
    broken: (row) => row.closeKind === "Pre-closed" && Boolean(row.closedDate) && row.closedDate! >= row.maturityDate,
  },
]);

/** The same rules on a whole row, which the repository runs on each new row and on the row after an update is merged over the stored one. */
export const checkFixedDeposit = depositRules.check;

export const createFixedDepositSchema = fixedDepositFields.superRefine(depositRules.refine);

/**
 * A partial update, merged over the stored row. "" clears an optional field, which switching
 * a deposit to Cumulative needs: its payout frequency has to go with it.
 */
export const updateFixedDepositSchema = fixedDepositFields
  .partial()
  .extend({
    payoutFrequency: clearableToUnset(z.enum(["Monthly", "Quarterly", "Yearly"])).optional(),
    accountId: clearable(nonEmptyString).optional(),
    bankName: clearable(nonEmptyString).optional(),
    maturityAmount: clearableToUnset(nonNegativeNumber).optional(),
    closedDate: clearable(isoDate).optional(),
    receivedAmount: clearableToUnset(nonNegativeNumber).optional(),
    closeKind: clearableToUnset(z.enum(FIXED_DEPOSIT_CLOSE_KINDS)).optional(),
  })
  // Close details sent with a status that isn't Closed contradict each other: refuse them, never drop them silently.
  .superRefine((value, ctx) => {
    if (value.status === undefined || value.status === "Closed") return;
    if (value.closedDate) ctx.addIssue({ code: "custom", path: ["closedDate"], message: "Only a closed deposit has a closing day" });
    if (value.receivedAmount !== undefined) ctx.addIssue({ code: "custom", path: ["receivedAmount"], message: "Only a closed deposit has an amount received" });
    if (value.closeKind !== undefined) ctx.addIssue({ code: "custom", path: ["closeKind"], message: "Only a closed deposit has a way it closed" });
  })
  // Reopening a deposit means it hasn't closed: setting any status but Closed clears what closing recorded.
  .transform((value) =>
    value.status !== undefined && value.status !== "Closed"
      ? { ...value, closedDate: "", receivedAmount: undefined, closeKind: undefined }
      : value,
  );

/** A row as read back from the Sheet: a valid create, plus its id. */
export const fixedDepositRowSchema = fixedDepositFields.extend({ id: nonEmptyString }).superRefine(depositRules.refine);

/** The FixedDeposits tab's columns, in order. */
export const FIXED_DEPOSIT_COLUMNS: (keyof FixedDeposit)[] = [
  "id",
  "name",
  "bankName",
  "principalAmount",
  "interestRate",
  "compoundingType",
  "payoutFrequency",
  "startDate",
  "maturityDate",
  "maturityAmount",
  "accountId",
  "status",
  "closedDate",
  "receivedAmount",
  "closeKind",
];

export const fixedDepositsRepository = createRepository<FixedDeposit>({
  sheetName: "FixedDeposits",
  columns: FIXED_DEPOSIT_COLUMNS,
  dateColumns: ["startDate", "maturityDate", "closedDate"],
  schema: fixedDepositRowSchema,
  check: checkFixedDeposit,
});
