import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { balanceSnapshotsRepository, updateBalanceSnapshotSchema } from "@/lib/sheets/balanceSnapshots";
import { CACHE_TAGS } from "@/lib/sheets/cached";

export const { PATCH, DELETE } = createItemRoute(
  balanceSnapshotsRepository,
  CACHE_TAGS.balanceSnapshots,
  updateBalanceSnapshotSchema,
);
