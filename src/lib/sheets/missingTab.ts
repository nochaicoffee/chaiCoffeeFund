/**
 * Whether a Sheets read failed because the tab doesn't exist: the API answers "Unable to parse range: <tab>!…" for a
 * range on a missing sheet. Used where a tab added later (Settings, ADR 0018) may not be in an older Sheet yet.
 */
export function isMissingTabError(error: unknown, sheetName: string): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Unable to parse range/i.test(message) && message.includes(sheetName);
}
