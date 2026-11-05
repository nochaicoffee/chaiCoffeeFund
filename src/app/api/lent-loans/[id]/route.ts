import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { lentLoansRepository, updateLentLoanSchema } from "@/lib/sheets/lentLoans";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(lentLoansRepository, CACHE_TAGS.lentLoans, updateLentLoanSchema);
