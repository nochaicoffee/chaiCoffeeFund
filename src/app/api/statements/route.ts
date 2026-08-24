import { createListRoute } from "@/lib/api/createCrudRoutes";
import { statementsRepository, createStatementSchema } from "@/lib/sheets/statements";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(statementsRepository, CACHE_TAGS.statements, createStatementSchema);
