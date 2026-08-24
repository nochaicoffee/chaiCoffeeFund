import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { statementsRepository, updateStatementSchema } from "@/lib/sheets/statements";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(statementsRepository, CACHE_TAGS.statements, updateStatementSchema);
