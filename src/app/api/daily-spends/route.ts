import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { createDailySpendSchema, dailySpendsRepository } from "@/lib/sheets/dailySpends";

export const { GET, POST } = createListRoute(dailySpendsRepository, CACHE_TAGS.dailySpends, createDailySpendSchema);
