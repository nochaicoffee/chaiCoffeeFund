import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { incomeSourcesRepository, updateIncomeSourceSchema } from "@/lib/sheets/incomeSources";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  incomeSourcesRepository,
  CACHE_TAGS.incomeSources,
  updateIncomeSourceSchema,
);
