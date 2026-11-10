import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { transferGuards } from "@/lib/sheets/transferGuards";
import { createTransferSchema, transfersRepository } from "@/lib/sheets/transfers";

export const { GET, POST } = createListRoute(transfersRepository, CACHE_TAGS.transfers, createTransferSchema, undefined, transferGuards);
