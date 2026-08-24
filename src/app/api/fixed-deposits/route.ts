import { createListRoute } from "@/lib/api/createCrudRoutes";
import { fixedDepositsRepository, createFixedDepositSchema } from "@/lib/sheets/fixedDeposits";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  fixedDepositsRepository,
  CACHE_TAGS.fixedDeposits,
  createFixedDepositSchema,
);
