import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { heldMoneyRepository, updateHeldMoneySchema } from "@/lib/sheets/heldMoney";

export const { PATCH, DELETE } = createItemRoute(heldMoneyRepository, CACHE_TAGS.heldMoney, updateHeldMoneySchema);
