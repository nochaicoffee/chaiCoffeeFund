import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { incomeEntriesRepository, updateIncomeEntrySchema } from "@/lib/sheets/incomeEntries";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  incomeEntriesRepository,
  CACHE_TAGS.incomeEntries,
  updateIncomeEntrySchema,
);
