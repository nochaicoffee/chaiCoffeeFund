import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { FixedDeposit } from "./types";

export const createFixedDepositSchema = z.object({
  name: nonEmptyString,
  bankName: nonEmptyString,
  principalAmount: nonNegativeNumber,
  interestRate: nonNegativeNumber,
  compoundingType: z.enum(["Cumulative", "Non-Cumulative"]),
  payoutFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]).optional(),
  startDate: isoDate,
  maturityDate: isoDate,
  maturityAmount: nonNegativeNumber,
  accountId: nonEmptyString.optional(),
  status: z.enum(["Active", "Matured", "Closed"]),
});

export const updateFixedDepositSchema = createFixedDepositSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const fixedDepositRowSchema = createFixedDepositSchema.extend({ id: nonEmptyString });

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
});
