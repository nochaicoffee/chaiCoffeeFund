import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { investmentTransactionsRepository, updateInvestmentTransactionSchema } from "@/lib/sheets/investmentTransactions";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  investmentTransactionsRepository,
  CACHE_TAGS.investmentTransactions,
  updateInvestmentTransactionSchema,
);
