import { createListRoute } from "@/lib/api/createCrudRoutes";
import { investmentTargetsRepository, createInvestmentTargetSchema } from "@/lib/sheets/investmentTargets";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { investmentTargetGuards } from "@/lib/sheets/investmentTargetGuards";

export const { GET, POST } = createListRoute(investmentTargetsRepository, CACHE_TAGS.investmentTargets, createInvestmentTargetSchema, undefined, investmentTargetGuards);
