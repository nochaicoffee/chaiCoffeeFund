import { createListRoute } from "@/lib/api/createCrudRoutes";
import { epfRatesRepository, createEpfRateSchema } from "@/lib/sheets/epfRates";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfRateGuards } from "@/lib/sheets/epfGuards";

export const { GET, POST } = createListRoute(
  epfRatesRepository,
  CACHE_TAGS.epfRates,
  createEpfRateSchema,
  undefined,
  epfRateGuards,
);
