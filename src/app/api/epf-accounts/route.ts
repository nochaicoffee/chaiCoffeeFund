import { createListRoute } from "@/lib/api/createCrudRoutes";
import { epfAccountsRepository, createEpfAccountSchema } from "@/lib/sheets/epfAccounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  epfAccountsRepository,
  CACHE_TAGS.epfAccounts,
  createEpfAccountSchema,
);
