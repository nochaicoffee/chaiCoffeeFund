import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { cardsRepository, updateCardSchema } from "@/lib/sheets/cards";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(cardsRepository, CACHE_TAGS.cards, updateCardSchema);
