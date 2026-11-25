/**
 * The app's name split for the logo's wordmark: "chaiCoffeeFund" is set as "chaiCoffee" and a teal "Fund".
 * Only a name that really ends in "Fund" (and has something before it) is split, so a fork with its own
 * name gets it in one colour instead of a made-up break.
 */
export function splitWordmark(appName: string): { lead: string; accent: string } {
  const ACCENT = "Fund";
  if (appName.length > ACCENT.length && appName.endsWith(ACCENT)) {
    return { lead: appName.slice(0, -ACCENT.length), accent: ACCENT };
  }
  return { lead: appName, accent: "" };
}
