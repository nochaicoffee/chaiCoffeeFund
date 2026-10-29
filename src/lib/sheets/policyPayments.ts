import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, nonNegativeNumber, onePaidFrom } from "./validation";
import { MAX_POLICY_YEARS, NCB_STEPS, POLICY_PAYMENT_STATUSES, type PolicyPayment } from "./types";

/** A term's fields. The repository reads column types from a plain object, so the rules across fields are added below. */
const policyPaymentFields = z.object({
  policyId: nonEmptyString,
  periodStart: isoDate,
  years: z.number().int().min(1).max(MAX_POLICY_YEARS),
  amount: nonNegativeNumber,
  paidOn: isoDate.optional(),
  status: z.enum(POLICY_PAYMENT_STATUSES),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
  sumInsured: nonNegativeNumber.optional(),
  ncb: z.number().optional(),
});

type PaymentRow = Omit<PolicyPayment, "id">;

/**
 * The rules across fields, one list used both ways (see policies.ts): `refine` for a create or row
 * schema, and `checkPolicyPayment` for the repository on the merged row. A text or date is "" in a
 * merged row, so set-ness is read by truthiness; a cleared number is unset (see `clearedNumber`).
 */
const paymentRules: { path: keyof PaymentRow; message: string; broken: (row: PaymentRow) => boolean }[] = [
  { path: "paidFromCardId", message: "Pay it from a card or a bank account, not both", broken: (row) => Boolean(row.paidFromAccountId && row.paidFromCardId) },
  { path: "paidOn", message: "A term that hasn't been paid has no paid-on day", broken: (row) => row.status === "Pending" && Boolean(row.paidOn) },
  { path: "ncb", message: `The no-claim bonus is one of ${NCB_STEPS.join(", ")} percent`, broken: (row) => row.ncb !== undefined && !(NCB_STEPS as readonly number[]).includes(row.ncb) },
];

/** The same rules on a whole row. */
export const checkPolicyPayment = (row: PaymentRow): string | null => paymentRules.find((rule) => rule.broken(row))?.message ?? null;

function refinePayment(row: PaymentRow, ctx: z.RefinementCtx) {
  for (const rule of paymentRules) if (rule.broken(row)) ctx.addIssue({ code: "custom", path: [rule.path], message: rule.message });
}

/** A number an update can clear: "" comes out as unset, so the merged row reads it as blank. */
const clearedNumber = (schema: z.ZodNumber) => z.union([schema, z.literal("")]).transform((value) => (value === "" ? undefined : value));

export const createPolicyPaymentSchema = policyPaymentFields.superRefine(refinePayment);

/** A partial update, merged over the stored row. "" clears where it was paid from, the paid-on day, a term's cover or its no-claim step. */
export const updatePolicyPaymentSchema = policyPaymentFields
  .partial()
  .extend({
    paidOn: clearable(isoDate).optional(),
    paidFromAccountId: clearable(nonEmptyString).optional(),
    paidFromCardId: clearable(nonEmptyString).optional(),
    sumInsured: clearedNumber(nonNegativeNumber).optional(),
    ncb: clearedNumber(z.number()).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paidFromAccountId && value.paidFromCardId) ctx.addIssue({ code: "custom", path: ["paidFromCardId"], message: "Pay it from a card or a bank account, not both" });
  })
  .transform(onePaidFrom)
  // A term that hasn't been paid has no paid-on day: setting it Pending clears the day.
  .transform((value) => (value.status === "Pending" && value.paidOn === undefined ? { ...value, paidOn: "" } : value));

/** A row as read back from the Sheet: a valid create, plus its id. */
export const policyPaymentRowSchema = policyPaymentFields.extend({ id: nonEmptyString }).superRefine(refinePayment);

/** The PolicyPayments tab's columns, in order. */
export const POLICY_PAYMENT_COLUMNS: (keyof PolicyPayment)[] = ["id", "policyId", "periodStart", "years", "amount", "paidOn", "status", "paidFromAccountId", "paidFromCardId", "sumInsured", "ncb"];

export const policyPaymentsRepository = createRepository<PolicyPayment>({
  sheetName: "PolicyPayments",
  columns: POLICY_PAYMENT_COLUMNS,
  dateColumns: ["periodStart", "paidOn"],
  schema: policyPaymentRowSchema,
  check: checkPolicyPayment,
});
