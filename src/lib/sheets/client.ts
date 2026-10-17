import "server-only";
import { google, sheets_v4 } from "googleapis";

let cachedClient: sheets_v4.Sheets | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSpreadsheetId(): string {
  return requireEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: requireEnv("GOOGLE_SERVICE_ACCOUNT_KEY_FILE"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({
    version: "v4",
    auth,
    // Google turns requests away once this minute's quota is used up (60 reads, and 60 writes, a minute per
    // user); a turned-away request wasn't carried out, so it's safe to send again. Three tries, 1s, 2s and
    // 4s apart, ride out a short burst; past that, the caller says so (lib/sheets/errors.ts).
    retryConfig: {
      retry: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
      statusCodesToRetry: [[429, 429]],
      httpMethodsToRetry: ["GET", "PUT", "POST"],
    },
  });
  return cachedClient;
}
