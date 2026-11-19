/**
 * App-wide settings that aren't secrets: the owner's display name for the greeting and
 * avatar, and the time zone "today" is computed in (the server may run in UTC once hosted).
 * Both come from settings, so each person who runs the app sets their own (docs/setup.md):
 *
 * - `OWNER_NAME`: the name in "Good afternoon, <name>". Empty means a plain "Good afternoon".
 * - `NEXT_PUBLIC_TIME_ZONE`: an IANA name such as "America/New_York"; India's if unset or not a real zone.
 *   It carries NEXT_PUBLIC_ because forms in the browser work out today's date too, and they must
 *   agree with the server. Next puts it in the build, so changing it means a redeploy.
 */
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

/** The time zone to use for a setting: itself when it names a real zone, otherwise India's. */
export function resolveTimeZone(value: string | undefined): string {
  const zone = value?.trim();
  if (!zone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** A name setting, trimmed, and capped so a paste can't fill a page header. */
export function resolveOwnerName(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 40);
}

export const appConfig = {
  appName: "chaiCoffeeFund",
  ownerName: resolveOwnerName(process.env.OWNER_NAME),
  // Written out in full so Next can put the setting into the browser's code as well as the server's.
  timeZone: resolveTimeZone(process.env.NEXT_PUBLIC_TIME_ZONE),
};
