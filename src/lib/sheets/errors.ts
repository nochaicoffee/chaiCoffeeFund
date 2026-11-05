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

/**
 * The request got no answer within the client's time limit (SHEETS_REQUEST_TIMEOUT_MS in client.ts).
 * Unlike a refusal, the request may have been carried out, so a save that ends this way can't say
 * "nothing was written". The library reports its own timeout as an aborted request.
 */
export function isTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, message, cause } = error as { name?: unknown; message?: unknown; cause?: { name?: unknown } };
  return name === "AbortError" || name === "TimeoutError" || cause?.name === "AbortError" || cause?.name === "TimeoutError" || (typeof message === "string" && /operation was aborted|timed out/i.test(message));
}

/** What to tell someone whose save couldn't reach the Sheet, in words, never the raw error. */
export function sheetsFailureMessage(error: unknown): string {
  if (isQuotaError(error)) return "Google Sheets is busy: this minute's requests are used up. Nothing was saved. Try again in a minute.";
  if (isTimeoutError(error)) return "Google Sheets didn't answer in time, so this may or may not have been saved. Check before trying again.";
  return "Couldn't save to the Sheet, so nothing was written. Try again.";
}
