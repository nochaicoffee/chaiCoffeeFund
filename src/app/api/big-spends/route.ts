import { createListRoute } from "@/lib/api/createCrudRoutes";
import { bigSpendsRepository, createBigSpendSchema } from "@/lib/sheets/bigSpends";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(bigSpendsRepository, CACHE_TAGS.bigSpends, createBigSpendSchema);
