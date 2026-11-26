import { LOOKS, type Look, type Setting } from "../sheets/types";

/**
 * The app's look (ADR 0018). The Settings tab's `look` row is the truth every device follows; a `look` cookie mirrors
 * it, for the sign-in page (which doesn't read the Sheet) and for when the Sheet can't be read.
 */
export const LOOK_COOKIE = "look";
export const DEFAULT_LOOK: Look = "Classic";
export const LOOK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLook(value: unknown): value is Look {
  return typeof value === "string" && (LOOKS as readonly string[]).includes(value);
}

/** The look the Settings tab holds: its `look` row's value, or null when there is no valid one (never set). */
export function lookFromSettings(settings: readonly Setting[]): Look | null {
  const value = settings.find((s) => s.key === "look")?.value;
  return isLook(value) ? value : null;
}

/**
 * The look a page is drawn in. `sheet` is the Settings tab's answer: a look, null when the tab has none (Classic), or
 * undefined when the Sheet wasn't read (signed out, or it failed), and then the cookie decides, else Classic.
 */
export function resolveLook(sheet: Look | null | undefined, cookie: string | undefined): Look {
  if (sheet !== undefined) return sheet ?? DEFAULT_LOOK;
  return isLook(cookie) ? cookie : DEFAULT_LOOK;
}

/** `<html>`'s data-look for a look: nothing for Classic, so Classic is exactly the page without the attribute. */
export function dataLookOf(look: Look): "neubrutal" | undefined {
  return look === "Neubrutalism" ? "neubrutal" : undefined;
}

/** How saving a look lands in the Settings tab: update the one `look` row when there is one, else add it. */
export function planLook(settings: readonly Setting[], look: Look): { kind: "update"; id: string } | { kind: "create" } | { kind: "none" } {
  const row = settings.find((s) => s.key === "look");
  if (!row) return { kind: "create" };
  return row.value === look ? { kind: "none" } : { kind: "update", id: row.id };
}
