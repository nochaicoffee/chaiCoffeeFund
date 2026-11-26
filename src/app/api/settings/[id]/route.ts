import { createItemRoute } from "@/lib/api/createCrudRoutes";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { settingsRepository, updateSettingSchema } from "@/lib/sheets/settings";

export const { PATCH, DELETE } = createItemRoute(settingsRepository, CACHE_TAGS.settings, updateSettingSchema);
