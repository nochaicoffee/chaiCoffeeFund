/**
 * Google refused the request because this minute's Sheets quota is used up
 * (60 reads, and 60 writes, a minute per user). The request wasn't carried
 * out, so it's safe to send again once the minute is up.
 */
export function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, status, message } = error as { code?: unknown; status?: unknown; message?: unknown };
  return code === 429 || status === 429 || (typeof message === "string" && /quota exceeded/i.test(message));
}

/** What to tell someone whose save couldn't reach the Sheet, in words, never the raw error. */
export function sheetsFailureMessage(error: unknown): string {
  return isQuotaError(error)
    ? "Google Sheets is busy: this minute's requests are used up. Nothing was saved. Try again in a minute."
    : "Couldn't save to the Sheet, so nothing was written. Try again.";
}
