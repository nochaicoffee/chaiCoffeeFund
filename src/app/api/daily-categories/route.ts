import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { createDailyCategorySchema, dailyCategoriesRepository } from "@/lib/sheets/dailyCategories";

export const { GET, POST } = createListRoute(dailyCategoriesRepository, CACHE_TAGS.dailyCategories, createDailyCategorySchema);
