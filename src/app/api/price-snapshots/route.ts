import { createListRoute } from "@/lib/api/createCrudRoutes";
import { priceSnapshotsRepository, createPriceSnapshotSchema } from "@/lib/sheets/priceSnapshots";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { priceSnapshotGuards } from "@/lib/sheets/priceGuards";

export const { GET, POST } = createListRoute(priceSnapshotsRepository, CACHE_TAGS.priceSnapshots, createPriceSnapshotSchema, undefined, priceSnapshotGuards);
