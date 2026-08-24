import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { subscriptionsRepository, updateSubscriptionSchema } from "@/lib/sheets/subscriptions";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  subscriptionsRepository,
  CACHE_TAGS.subscriptions,
  updateSubscriptionSchema,
);
