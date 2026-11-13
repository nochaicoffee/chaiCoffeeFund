import { createListRoute } from "@/lib/api/createCrudRoutes";
import { balanceSnapshotsRepository, createBalanceSnapshotSchema } from "@/lib/sheets/balanceSnapshots";
import { balanceSnapshotGuards } from "@/lib/sheets/balanceGuards";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { GET, POST } = createListRoute(
  balanceSnapshotsRepository,
  CACHE_TAGS.balanceSnapshots,
  createBalanceSnapshotSchema,
  undefined,
  balanceSnapshotGuards,
);
