import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { accountsRepository, updateAccountSchema } from "@/lib/sheets/accounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(accountsRepository, CACHE_TAGS.accounts, updateAccountSchema);
