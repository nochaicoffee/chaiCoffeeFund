import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, clearableToUnset, isoDate, nonEmptyString, nonNegativeNumber, positiveNumber, rowRules } from "./validation";
import type { FixedDeposit } from "./types";

/** A deposit's fields. The repository reads column types from a plain object, so the rules across fields are added below. */
const fixedDepositFields = z.object({
  name: nonEmptyString,
  bankName: nonEmptyString,
  principalAmount: positiveNumber,
  interestRate: nonNegativeNumber,
  compoundingType: z.enum(["Cumulative", "Non-Cumulative"]),
  payoutFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  startDate: isoDate,
  maturityDate: isoDate,
  maturityAmount: nonNegativeNumber,
  accountId: nonEmptyString.optional(),
  status: z.enum(["Active", "Matured", "Closed"]),
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
    broken: (row) => row.maturityAmount < row.principalAmount,
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
]);

/** The same rules on a whole row, which the repository runs on each new row and on the row after an update is merged over the stored one. */
export const checkFixedDeposit = depositRules.check;

export const createFixedDepositSchema = fixedDepositFields.superRefine(depositRules.refine);

/**
 * A partial update, merged over the stored row. "" clears an optional field, which switching
 * a deposit to Cumulative needs: its payout frequency has to go with it.
 */
export const updateFixedDepositSchema = fixedDepositFields.partial().extend({
  payoutFrequency: clearableToUnset(z.enum(["Monthly", "Quarterly", "Yearly"])).optional(),
  accountId: clearable(nonEmptyString).optional(),
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const fixedDepositRowSchema = fixedDepositFields.extend({ id: nonEmptyString }).superRefine(depositRules.refine);

export const fixedDepositsRepository = createRepository<FixedDeposit>({
  sheetName: "FixedDeposits",
  columns: [
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
  ],
  dateColumns: ["startDate", "maturityDate"],
  schema: fixedDepositRowSchema,
  check: checkFixedDeposit,
});
