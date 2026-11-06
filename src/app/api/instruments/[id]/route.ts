import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { instrumentsRepository, updateInstrumentSchema } from "@/lib/sheets/instruments";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { instrumentGuards } from "@/lib/sheets/priceGuards";

export const { PATCH, DELETE } = createItemRoute(instrumentsRepository, CACHE_TAGS.instruments, updateInstrumentSchema, undefined, instrumentGuards);
