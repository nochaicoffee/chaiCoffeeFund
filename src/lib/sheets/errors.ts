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

/** The start of every quota message, so a dialog and an API route say it the same way. */
const QUOTA_BUSY = "Google Sheets is busy: this minute's requests are used up.";

/**
 * What an API route answers (429) when the quota ran out. A route can have written a step or two before the refusal, so unlike a
 * dialog's save it can't promise nothing was written: a save is to be checked before it's repeated.
 */
export const QUOTA_ROUTE_MESSAGE = `${QUOTA_BUSY} Try again in a minute. If it was a save, check it before repeating it.`;

/** What to tell someone whose save couldn't reach the Sheet, in words, never the raw error. */
export function sheetsFailureMessage(error: unknown): string {
  if (isQuotaError(error)) return `${QUOTA_BUSY} Nothing was saved. Try again in a minute.`;
  if (isTimeoutError(error)) return "Google Sheets didn't answer in time, so this may or may not have been saved. Check before trying again.";
  return "Couldn't save to the Sheet, so nothing was written. Try again.";
}
