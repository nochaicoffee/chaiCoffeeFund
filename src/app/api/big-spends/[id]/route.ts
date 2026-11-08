import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { bigSpendsRepository, updateBigSpendSchema } from "@/lib/sheets/bigSpends";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(bigSpendsRepository, CACHE_TAGS.bigSpends, updateBigSpendSchema);
