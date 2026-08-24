import { createListRoute } from "@/lib/api/createCrudRoutes";
import { subscriptionsRepository, createSubscriptionSchema } from "@/lib/sheets/subscriptions";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  subscriptionsRepository,
  CACHE_TAGS.subscriptions,
  createSubscriptionSchema,
);
