import { createListRoute } from "@/lib/api/createCrudRoutes";
import { subscriptionPaymentsRepository, createSubscriptionPaymentSchema } from "@/lib/sheets/subscriptionPayments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  subscriptionPaymentsRepository,
  CACHE_TAGS.subscriptionPayments,
  createSubscriptionPaymentSchema,
);
