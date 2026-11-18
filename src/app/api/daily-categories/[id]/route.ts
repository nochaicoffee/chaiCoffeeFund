import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { dailyCategoriesRepository, updateDailyCategorySchema } from "@/lib/sheets/dailyCategories";

export const { PATCH, DELETE } = createItemRoute(dailyCategoriesRepository, CACHE_TAGS.dailyCategories, updateDailyCategorySchema);
