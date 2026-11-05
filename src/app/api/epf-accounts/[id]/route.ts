import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { epfAccountsRepository, updateEpfAccountSchema } from "@/lib/sheets/epfAccounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfAccountGuards } from "@/lib/sheets/epfGuards";

export const { PATCH, DELETE } = createItemRoute(
  epfAccountsRepository,
  CACHE_TAGS.epfAccounts,
  updateEpfAccountSchema,
  undefined,
  epfAccountGuards,
);
