import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, rowRules } from "./validation";
import { EPF_RATE_SOURCES, type EpfRate } from "./types";

/**
 * The rate for a financial year that someone entered: Declared by EPFO, or Assumed until it is (ADR 0011). A credited year's
 * rate is worked out from its own interest and never stored, so it has no row here.
 */
const epfRateFields = z.object({
  epfAccountId: nonEmptyString,
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, "Enter the year as 2026-27"),
  ratePercent: z.number().gt(0).max(30),
  source: z.enum(EPF_RATE_SOURCES),
});

type RateRow = Omit<EpfRate, "id">;

const rateRules = rowRules<RateRow>([
  {
    path: "financialYear",
    message: "A financial year runs from one year to the next, such as 2026-27",
    broken: (row) => {
      const start = Number(row.financialYear.slice(0, 4));
      return Number(row.financialYear.slice(5)) !== (start + 1) % 100;
    },
  },
]);

export const checkEpfRate = rateRules.check;

export const createEpfRateSchema = epfRateFields.superRefine(rateRules.refine);

/** A partial update, merged over the stored row. */
export const updateEpfRateSchema = epfRateFields.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const epfRateRowSchema = epfRateFields.extend({ id: nonEmptyString }).superRefine(rateRules.refine);

/** The EpfRates tab's columns, in order. */
export const EPF_RATE_COLUMNS: (keyof EpfRate)[] = ["id", "epfAccountId", "financialYear", "ratePercent", "source"];

export const epfRatesRepository = createRepository<EpfRate>({
  sheetName: "EpfRates",
  columns: EPF_RATE_COLUMNS,
  schema: epfRateRowSchema,
  check: checkEpfRate,
});
