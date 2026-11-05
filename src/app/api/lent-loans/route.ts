import { createListRoute } from "@/lib/api/createCrudRoutes";
import { lentLoansRepository, createLentLoanSchema } from "@/lib/sheets/lentLoans";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(lentLoansRepository, CACHE_TAGS.lentLoans, createLentLoanSchema);
