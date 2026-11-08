import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, onePaidFrom, positiveNumber } from "./validation";
import { BIG_SPEND_CATEGORIES, type BigSpend } from "./types";

/** A big spend's fields (docs/design/expenses.md, "Big spends"). It explains a month and never adds to it. */
const bigSpendFields = z.object({
  date: isoDate,
  amount: positiveNumber,
  name: nonEmptyString,
  category: z.enum(BIG_SPEND_CATEGORIES),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
  note: nonEmptyString.optional(),
});

const BOTH = "Paid from a card or a bank account, not both";

/** The one rule across fields, on a whole merged row (a cleared text is ""). */
export const checkBigSpend = (row: Omit<BigSpend, "id">): string | null => (row.paidFromAccountId && row.paidFromCardId ? BOTH : null);

const refine = (row: Pick<BigSpend, "paidFromAccountId" | "paidFromCardId">, ctx: z.RefinementCtx) => {
  const broken = checkBigSpend(row as Omit<BigSpend, "id">);
  if (broken) ctx.addIssue({ code: "custom", path: ["paidFromCardId"], message: broken });
};

export const createBigSpendSchema = bigSpendFields.superRefine(refine);

/** A partial update. "" clears where it was paid from or the note; setting one paid-from clears the other. */
export const updateBigSpendSchema = bigSpendFields
  .partial()
  .extend({ paidFromAccountId: clearable(nonEmptyString).optional(), paidFromCardId: clearable(nonEmptyString).optional(), note: clearable(nonEmptyString).optional() })
  .superRefine(refine)
  .transform(onePaidFrom);

/** A row as read back from the Sheet: a valid create, plus its id. */
export const bigSpendRowSchema = bigSpendFields.extend({ id: nonEmptyString }).superRefine(refine);

/** The BigSpends tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=BigSpends`. */
export const BIG_SPEND_COLUMNS: (keyof BigSpend)[] = ["id", "date", "amount", "name", "category", "paidFromAccountId", "paidFromCardId", "note"];

export const bigSpendsRepository = createRepository<BigSpend>({
  sheetName: "BigSpends",
  columns: BIG_SPEND_COLUMNS,
  dateColumns: ["date"],
  schema: bigSpendRowSchema,
  check: checkBigSpend,
});
