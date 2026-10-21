import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { SubscriptionPayment } from "./types";

/**
 * A payment's fields. The repository reads column types from a plain object, so the
 * cross-field checks are added below. Skipped is a renewal that didn't charge (#125):
 * it's stored as a ₹0 payment so the renewal isn't flagged as not recorded.
 */
const subscriptionPaymentFields = z.object({
  subscriptionId: nonEmptyString,
  paymentDate: isoDate,
  amount: nonNegativeNumber,
  status: z.enum(["Pending", "Paid", "Skipped"]),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
});

type PaymentFields = Partial<z.infer<typeof subscriptionPaymentFields>>;

const BOTH_PLACES = "Charge it to a card or a bank account, not both";
const SKIPPED_WITH_AMOUNT = "A renewal that didn't charge is recorded as ₹0";

/** Charged to a card or to a bank account, never both; and a Skipped one charged nothing. */
function paymentChecks(value: PaymentFields, ctx: z.RefinementCtx) {
  if (value.paidFromAccountId && value.paidFromCardId) ctx.addIssue({ code: "custom", path: ["paidFromCardId"], message: BOTH_PLACES });
  if (value.status === "Skipped" && value.amount !== undefined && value.amount !== 0) ctx.addIssue({ code: "custom", path: ["amount"], message: SKIPPED_WITH_AMOUNT });
}

/**
 * The same rules on a whole row, run by the repository after an update is merged over
 * the stored one: an update of only the amount can't tell the row is Skipped.
 */
export function checkSubscriptionPayment(row: Pick<SubscriptionPayment, "status" | "amount" | "paidFromAccountId" | "paidFromCardId">): string | null {
  if (row.paidFromAccountId && row.paidFromCardId) return BOTH_PLACES;
  if (row.status === "Skipped" && row.amount !== 0) return SKIPPED_WITH_AMOUNT;
  return null;
}

export const createSubscriptionPaymentSchema = subscriptionPaymentFields.superRefine(paymentChecks);

/**
 * What an update implies, so the row it's merged over stays valid: setting a card or an
 * account clears the other, and marking it Skipped records ₹0.
 */
function impliedFields<T extends PaymentFields>(value: T): T {
  let implied = value;
  if (value.paidFromAccountId) implied = { ...implied, paidFromCardId: "" };
  else if (value.paidFromCardId) implied = { ...implied, paidFromAccountId: "" };
  if (value.status === "Skipped") implied = { ...implied, amount: 0 };
  return implied;
}

/** A partial update, merged over the stored row. "" clears where it was charged (as for a subscription, #124). */
export const updateSubscriptionPaymentSchema = subscriptionPaymentFields
  .partial()
  .extend({ paidFromAccountId: clearable(nonEmptyString).optional(), paidFromCardId: clearable(nonEmptyString).optional() })
  .superRefine(paymentChecks)
  .transform(impliedFields);

/** A row as read back from the Sheet: a valid create, plus its id. */
export const subscriptionPaymentRowSchema = subscriptionPaymentFields.extend({ id: nonEmptyString });

/** The SubscriptionPayments tab's columns, in order. */
export const SUBSCRIPTION_PAYMENT_COLUMNS: (keyof SubscriptionPayment)[] = ["id", "subscriptionId", "paymentDate", "amount", "status", "paidFromAccountId", "paidFromCardId"];

export const subscriptionPaymentsRepository = createRepository<SubscriptionPayment>({
  sheetName: "SubscriptionPayments",
  columns: SUBSCRIPTION_PAYMENT_COLUMNS,
  dateColumns: ["paymentDate"],
  schema: subscriptionPaymentRowSchema,
  check: checkSubscriptionPayment,
});
