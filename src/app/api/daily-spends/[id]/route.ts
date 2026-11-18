import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { dailySpendsRepository, updateDailySpendSchema } from "@/lib/sheets/dailySpends";

export const { PATCH, DELETE } = createItemRoute(dailySpendsRepository, CACHE_TAGS.dailySpends, updateDailySpendSchema);
