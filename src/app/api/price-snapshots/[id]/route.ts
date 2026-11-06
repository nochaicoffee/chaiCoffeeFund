import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { priceSnapshotsRepository, updatePriceSnapshotSchema } from "@/lib/sheets/priceSnapshots";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { priceSnapshotGuards } from "@/lib/sheets/priceGuards";

export const { PATCH, DELETE } = createItemRoute(priceSnapshotsRepository, CACHE_TAGS.priceSnapshots, updatePriceSnapshotSchema, undefined, priceSnapshotGuards);
