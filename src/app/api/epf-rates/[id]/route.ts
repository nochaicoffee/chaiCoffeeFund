import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { epfRatesRepository, updateEpfRateSchema } from "@/lib/sheets/epfRates";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfRateGuards } from "@/lib/sheets/epfGuards";

export const { PATCH, DELETE } = createItemRoute(
  epfRatesRepository,
  CACHE_TAGS.epfRates,
  updateEpfRateSchema,
  undefined,
  epfRateGuards,
);
