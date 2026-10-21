import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import { SUBSCRIPTION_CATEGORIES, type Subscription } from "./types";

/** A subscription's fields. The repository reads column types from a plain object, so the cross-field check is added below. */
const subscriptionFields = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  category: z.enum(SUBSCRIPTION_CATEGORIES),
  amount: nonNegativeNumber,
  billingCycle: z.enum(["Monthly", "Quarterly", "Yearly"]),
  billingAnchorDate: isoDate,
  startDate: isoDate,
  status: z.enum(["Active", "Paused", "Cancelled"]),
  endDate: isoDate.optional(),
  defaultPaidFromAccountId: nonEmptyString.optional(),
  defaultPaidFromCardId: nonEmptyString.optional(),
  resumedOn: isoDate.optional(),
});

const BOTH_PLACES = "Charge it to a card or a bank account, not both";

/** Charged to a card or to a bank account, never both (the payment-source principle in docs/system-design.md). */
function chargedToOnePlace(value: { defaultPaidFromAccountId?: string; defaultPaidFromCardId?: string }, ctx: z.RefinementCtx) {
  if (value.defaultPaidFromAccountId && value.defaultPaidFromCardId) ctx.addIssue({ code: "custom", path: ["defaultPaidFromCardId"], message: BOTH_PLACES });
}

/** The same rule on a whole row, which the repository runs after an update is merged over the stored one (#125). */
export function checkSubscription(row: Pick<Subscription, "defaultPaidFromAccountId" | "defaultPaidFromCardId">): string | null {
  return row.defaultPaidFromAccountId && row.defaultPaidFromCardId ? BOTH_PLACES : null;
}

export const createSubscriptionSchema = subscriptionFields.superRefine(chargedToOnePlace);

/** Setting where it's charged clears the other place, so an update merged over the row never leaves both set. */
function oneChargedTo<T extends { defaultPaidFromAccountId?: string; defaultPaidFromCardId?: string }>(value: T): T {
  if (value.defaultPaidFromAccountId) return { ...value, defaultPaidFromCardId: "" };
  if (value.defaultPaidFromCardId) return { ...value, defaultPaidFromAccountId: "" };
  return value;
}

/**
 * A partial update, merged over the stored row. "" clears an optional field (the
 * cancelled-on date when one restarts, or where it's charged), and setting a card or an
 * account clears the other.
 */
export const updateSubscriptionSchema = subscriptionFields
  .partial()
  .extend({
    endDate: clearable(isoDate).optional(),
    resumedOn: clearable(isoDate).optional(),
    defaultPaidFromAccountId: clearable(nonEmptyString).optional(),
    defaultPaidFromCardId: clearable(nonEmptyString).optional(),
  })
  .superRefine(chargedToOnePlace)
  .transform(oneChargedTo);

/** A row as read back from the Sheet: a valid create, plus its id. */
export const subscriptionRowSchema = subscriptionFields.extend({ id: nonEmptyString });

/** The Subscriptions tab's columns, in order. endDate and the two charged-to columns were added on the end (#124), and resumedOn after them (#128). */
export const SUBSCRIPTION_COLUMNS: (keyof Subscription)[] = [
  "id",
  "name",
  "alias",
  "category",
  "amount",
  "billingCycle",
  "billingAnchorDate",
  "startDate",
  "status",
  "endDate",
  "defaultPaidFromAccountId",
  "defaultPaidFromCardId",
  "resumedOn",
];

export const subscriptionsRepository = createRepository<Subscription>({
  sheetName: "Subscriptions",
  columns: SUBSCRIPTION_COLUMNS,
  dateColumns: ["billingAnchorDate", "startDate", "endDate", "resumedOn"],
  schema: subscriptionRowSchema,
  check: checkSubscription,
});
