import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { dailyBudgetsRepository, updateDailyBudgetSchema } from "@/lib/sheets/dailyBudgets";

export const { PATCH, DELETE } = createItemRoute(dailyBudgetsRepository, CACHE_TAGS.dailyBudgets, updateDailyBudgetSchema);
