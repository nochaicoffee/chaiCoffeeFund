import { createListRoute } from "@/lib/api/createCrudRoutes";
import { incomeSourcesRepository, createIncomeSourceSchema } from "@/lib/sheets/incomeSources";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  incomeSourcesRepository,
  CACHE_TAGS.incomeSources,
  createIncomeSourceSchema,
);
