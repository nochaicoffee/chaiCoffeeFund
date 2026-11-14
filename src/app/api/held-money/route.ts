import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { createHeldMoneySchema, heldMoneyRepository } from "@/lib/sheets/heldMoney";

export const { GET, POST } = createListRoute(heldMoneyRepository, CACHE_TAGS.heldMoney, createHeldMoneySchema);
