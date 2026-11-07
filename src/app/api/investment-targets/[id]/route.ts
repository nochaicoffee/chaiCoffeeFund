import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { investmentTargetsRepository, updateInvestmentTargetSchema } from "@/lib/sheets/investmentTargets";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { investmentTargetGuards } from "@/lib/sheets/investmentTargetGuards";

export const { PATCH, DELETE } = createItemRoute(investmentTargetsRepository, CACHE_TAGS.investmentTargets, updateInvestmentTargetSchema, undefined, investmentTargetGuards);
