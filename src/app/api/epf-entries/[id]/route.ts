import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { epfEntriesRepository, updateEpfEntrySchema } from "@/lib/sheets/epfEntries";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfEntryGuards } from "@/lib/sheets/epfGuards";

export const { PATCH, DELETE } = createItemRoute(
  epfEntriesRepository,
  CACHE_TAGS.epfEntries,
  updateEpfEntrySchema,
  undefined,
  epfEntryGuards,
);
