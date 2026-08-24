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

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}
