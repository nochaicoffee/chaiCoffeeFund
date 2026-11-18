import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { createDailyBudgetSchema, dailyBudgetsRepository } from "@/lib/sheets/dailyBudgets";

export const { GET, POST } = createListRoute(dailyBudgetsRepository, CACHE_TAGS.dailyBudgets, createDailyBudgetSchema);
