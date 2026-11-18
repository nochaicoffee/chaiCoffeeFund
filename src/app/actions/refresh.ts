"use server";

import { updateTag } from "next/cache";
import { invalidatePriceSeries } from "@/lib/prices/series";
import { CACHE_TAGS } from "@/lib/sheets/cached";

/** The global "Refresh" button: forces every cached read to re-fetch from Sheets on next access. */
export async function refreshAllData() {
  for (const tag of Object.values(CACHE_TAGS)) {
    updateTag(tag);
  }
  // The price series also keeps a five-minute copy in this instance, which the tag can't reach.
  invalidatePriceSeries();
}
