import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { transferGuards } from "@/lib/sheets/transferGuards";
import { transfersRepository, updateTransferSchema } from "@/lib/sheets/transfers";

export const { PATCH, DELETE } = createItemRoute(transfersRepository, CACHE_TAGS.transfers, updateTransferSchema, undefined, transferGuards);
