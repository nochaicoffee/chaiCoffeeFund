import { createListRoute } from "@/lib/api/createCrudRoutes";
import { epfEntriesRepository, createEpfEntrySchema } from "@/lib/sheets/epfEntries";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfEntryGuards } from "@/lib/sheets/epfGuards";

export const { GET, POST } = createListRoute(
  epfEntriesRepository,
  CACHE_TAGS.epfEntries,
  createEpfEntrySchema,
  undefined,
  epfEntryGuards,
);
