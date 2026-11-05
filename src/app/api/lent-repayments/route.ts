import { createListRoute } from "@/lib/api/createCrudRoutes";
import { lentRepaymentsRepository, createLentRepaymentSchema } from "@/lib/sheets/lentRepayments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(lentRepaymentsRepository, CACHE_TAGS.lentRepayments, createLentRepaymentSchema);
