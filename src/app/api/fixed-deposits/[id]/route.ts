import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { fixedDepositsRepository, updateFixedDepositSchema } from "@/lib/sheets/fixedDeposits";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  fixedDepositsRepository,
  CACHE_TAGS.fixedDeposits,
  updateFixedDepositSchema,
);
