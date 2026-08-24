import { createListRoute } from "@/lib/api/createCrudRoutes";
import { investmentTransactionsRepository, createInvestmentTransactionSchema } from "@/lib/sheets/investmentTransactions";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  investmentTransactionsRepository,
  CACHE_TAGS.investmentTransactions,
  createInvestmentTransactionSchema,
);
