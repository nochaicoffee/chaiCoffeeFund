import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { createDailyCategoryLimitSchema, dailyCategoryLimitsRepository } from "@/lib/sheets/dailyCategoryLimits";

export const { GET, POST } = createListRoute(dailyCategoryLimitsRepository, CACHE_TAGS.dailyCategoryLimits, createDailyCategoryLimitSchema);
