import { createListRoute } from "@/lib/api/createCrudRoutes";
import { incomeEntriesRepository, createIncomeEntrySchema } from "@/lib/sheets/incomeEntries";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  incomeEntriesRepository,
  CACHE_TAGS.incomeEntries,
  createIncomeEntrySchema,
);
