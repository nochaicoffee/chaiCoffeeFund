import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { subscriptionPaymentsRepository, updateSubscriptionPaymentSchema } from "@/lib/sheets/subscriptionPayments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  subscriptionPaymentsRepository,
  CACHE_TAGS.subscriptionPayments,
  updateSubscriptionPaymentSchema,
);
