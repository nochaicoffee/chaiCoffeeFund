import { createListRoute } from "@/lib/api/createCrudRoutes";
import { instrumentsRepository, createInstrumentSchema } from "@/lib/sheets/instruments";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { instrumentGuards } from "@/lib/sheets/priceGuards";

export const { GET, POST } = createListRoute(instrumentsRepository, CACHE_TAGS.instruments, createInstrumentSchema, undefined, instrumentGuards);
