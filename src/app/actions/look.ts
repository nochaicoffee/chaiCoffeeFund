"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { isLook, LOOK_COOKIE, LOOK_COOKIE_MAX_AGE, planLook } from "@/lib/look/look";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { settingsRepository } from "@/lib/sheets/settings";
import type { Look } from "@/lib/sheets/types";

export type SaveLookResult = { ok: true } | { ok: false; message: string };

/**
 * The look switch (ADR 0018): saves the look to the Settings tab, so every device follows it, then mirrors it in this
 * device's cookie for the sign-in page. The switch has already shown the new look; on a failure it puts the old one back.
 */
export async function saveLook(look: Look): Promise<SaveLookResult> {
  if (!isLook(look)) return { ok: false, message: "That isn't a look." };
  try {
    const plan = planLook(await settingsRepository.list(), look);
    if (plan.kind === "update") await settingsRepository.update(plan.id, { key: "look", value: look });
    else if (plan.kind === "create") await settingsRepository.create({ key: "look", value: look });
  } catch (error) {
    console.error("[look] saveLook failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: "Couldn't save the look to your Sheet, so it's back as it was. Try again in a moment." };
  }
  updateTag(CACHE_TAGS.settings);
  (await cookies()).set(LOOK_COOKIE, look, { path: "/", maxAge: LOOK_COOKIE_MAX_AGE, sameSite: "lax" });
  return { ok: true };
}
