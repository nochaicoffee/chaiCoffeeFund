import { createListRoute } from "@/lib/api/createCrudRoutes";
import { toClientCard } from "@/lib/forms/clientCard";
import { cardsRepository, createCardSchema } from "@/lib/sheets/cards";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(cardsRepository, CACHE_TAGS.cards, createCardSchema, toClientCard);
