import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { dailyCategoryLimitsRepository, updateDailyCategoryLimitSchema } from "@/lib/sheets/dailyCategoryLimits";

export const { PATCH, DELETE } = createItemRoute(dailyCategoryLimitsRepository, CACHE_TAGS.dailyCategoryLimits, updateDailyCategoryLimitSchema);
