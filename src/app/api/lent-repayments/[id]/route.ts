import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { lentRepaymentsRepository, updateLentRepaymentSchema } from "@/lib/sheets/lentRepayments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(lentRepaymentsRepository, CACHE_TAGS.lentRepayments, updateLentRepaymentSchema);
