import "server-only";
import { google, gmail_v1 } from "googleapis";

let cachedClient: gmail_v1.Gmail | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * A Gmail API client for the personal Gmail account holding statement
 * emails — separate from the Sheets service account in `lib/sheets/client.ts`.
 * Personal Gmail has no service-account equivalent, so this uses a Desktop
 * OAuth client + a refresh token obtained once via `scripts/authorizeGmail.ts`.
 * Scope is `gmail.readonly` only — this pipeline never mutates Gmail state
 * (see `lib/statementIngestion/runIngestion.ts` for why).
 */
export function getGmailClient(): gmail_v1.Gmail {
  if (cachedClient) return cachedClient;

  const auth = new google.auth.OAuth2(requireEnv("GMAIL_OAUTH_CLIENT_ID"), requireEnv("GMAIL_OAUTH_CLIENT_SECRET"));
  auth.setCredentials({ refresh_token: requireEnv("GMAIL_OAUTH_REFRESH_TOKEN") });

  cachedClient = google.gmail({ version: "v1", auth });
  return cachedClient;
}

export function getStatementLabel(): string {
  return requireEnv("GMAIL_STATEMENT_LABEL");
}

/** The label bank account statements are filed under, apart from the card statements'. */
export function getAccountStatementLabel(): string {
  return requireEnv("GMAIL_ACCOUNT_STATEMENT_LABEL");
}

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
