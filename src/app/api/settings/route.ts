import { createListRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { createSettingSchema, settingsRepository } from "@/lib/sheets/settings";

export const { GET, POST } = createListRoute(settingsRepository, CACHE_TAGS.settings, createSettingSchema);
