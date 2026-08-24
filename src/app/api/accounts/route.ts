import { createListRoute } from "@/lib/api/createCrudRoutes";
import { accountsRepository, createAccountSchema } from "@/lib/sheets/accounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(accountsRepository, CACHE_TAGS.accounts, createAccountSchema);
