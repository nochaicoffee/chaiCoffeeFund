import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { loanInstallmentsRepository, updateLoanInstallmentSchema } from "@/lib/sheets/loanInstallments";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  loanInstallmentsRepository,
  CACHE_TAGS.loanInstallments,
  updateLoanInstallmentSchema,
);
