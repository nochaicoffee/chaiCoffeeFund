/** What went wrong reaching the Sheet, in words someone setting up can act on. */
export type SheetProblemKind = "not-shared" | "wrong-id" | "api-off" | "bad-key" | "not-a-sheet" | "quota" | "other";

export interface SheetProblem {
  kind: SheetProblemKind;
  /** What it means, in a sentence. */
  message: string;
  /** What to do about it. */
  fix: string;
}

function textOf(error: unknown): { code: number | undefined; message: string } {
  if (typeof error !== "object" || error === null) return { code: undefined, message: String(error) };
  const { code, status, message } = error as { code?: unknown; status?: unknown; message?: unknown };
  const number = typeof code === "number" ? code : typeof status === "number" ? status : undefined;
  return { code: number, message: typeof message === "string" ? message : "" };
}

/**
 * Turns a Google error from the Sheets API into the usual causes of a failed setup. Matches on
 * Google's own wording, which has been stable for years, and falls back to "other" with a pointer
 * to the server's log rather than guessing.
 */
export function sheetProblem(error: unknown, serviceAccountEmail: string | null = null): SheetProblem {
  const { code, message } = textOf(error);
  const who = serviceAccountEmail ?? "the service account's email (the client_email in its key)";

  if (/has not been used in project|sheets api.*disabled|SERVICE_DISABLED|accessNotConfigured/i.test(message)) {
    return { kind: "api-off", message: "The Google Sheets API isn't turned on for your Google Cloud project.", fix: "In Google Cloud, open APIs & Services, Library, search for Google Sheets API and press Enable. It can take a minute to start working." };
  }
  if (/invalid_grant|invalid jwt|private key|DECODER|PEM|no key or keyfile|could not load the default credentials|Missing required environment variable: GOOGLE_SERVICE_ACCOUNT_KEY|isn't the service account/i.test(message)) {
    return { kind: "bad-key", message: "The service account key can't be used.", fix: "Create a new key for the service account (Keys, Add key, JSON) and paste the whole file into GOOGLE_SERVICE_ACCOUNT_KEY. If it was base64 or pasted into a box, check nothing was cut off." };
  }
  if (/not supported for this document/i.test(message)) {
    return { kind: "not-a-sheet", message: "That file isn't a Google Sheet. It looks like an uploaded Excel file.", fix: "Open it and choose File, Save as Google Sheets. Use the new Sheet's ID." };
  }
  if (code === 429 || /quota exceeded/i.test(message)) {
    return { kind: "quota", message: "Google says this minute's Sheets requests are used up.", fix: "Wait a minute and check again." };
  }
  if (code === 403 || /does not have permission|permission denied|caller does not have/i.test(message)) {
    return { kind: "not-shared", message: "The Sheet exists but the service account isn't allowed to open it.", fix: `Open your Sheet, press Share, add ${who} and give it Editor access. Untick "Notify" if you like: it is a robot.` };
  }
  if (code === 404 || /requested entity was not found/i.test(message)) {
    return { kind: "wrong-id", message: "Google can't find a spreadsheet with that ID.", fix: "Copy the ID again from the Sheet's address: the long part between /d/ and /edit. If it's right, the Sheet may be shared with the wrong account." };
  }
  return { kind: "other", message: "Couldn't read the Sheet.", fix: "The server's log has Google's own message. On Vercel, open the project's Logs." };
}
