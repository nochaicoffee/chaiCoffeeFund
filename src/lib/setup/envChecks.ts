import { allowedEmail, MIN_SECRET_LENGTH, type AuthEnv } from "@/lib/auth/config";

/** Which part of the setup a setting belongs to, in the order the guide takes them. */
export type SetupGroup = "sheet" | "signin" | "gmail" | "claude" | "cron" | "display";

export const GROUP_LABELS: Record<SetupGroup, string> = {
  sheet: "Your Google Sheet",
  signin: "Sign-in",
  gmail: "Gmail statement import",
  claude: "Claude connector",
  cron: "Daily sync",
  display: "Your name and time zone",
};

/** One setting, whether it's set properly, and what to do if not. Never the value itself. */
export interface EnvCheck {
  name: string;
  group: SetupGroup;
  /** Without it the app doesn't work (the Sheet and sign-in settings); the rest are optional. */
  required: boolean;
  ok: boolean;
  /** What to do when it isn't ok, or what it is when it is. */
  hint: string;
}

/** What the service account key setting holds: nothing, a usable key, or something that isn't one. */
export type KeyState = "missing" | "ok" | "invalid";

type Env = Record<string, string | undefined>;

const filled = (value: string | undefined) => Boolean(value?.trim());
/** A spreadsheet ID is the long run of letters, digits, "-" and "_" between /d/ and /edit in its address. */
const SPREADSHEET_ID = /^[A-Za-z0-9_-]{20,}$/;

export const GMAIL_SETTINGS = ["GMAIL_OAUTH_CLIENT_ID", "GMAIL_OAUTH_CLIENT_SECRET", "GMAIL_OAUTH_REFRESH_TOKEN", "GMAIL_STATEMENT_LABEL", "GMAIL_ACCOUNT_STATEMENT_LABEL"] as const;

/**
 * Every setting the app reads, checked without ever returning a value (the page that shows this is
 * public until sign-in is set up, and a setting's value is a secret). `key` is what the key setting
 * holds, found by the caller because a key file has to be read from disk.
 */
export function envChecks(env: Env, key: KeyState): EnvCheck[] {
  const auth = env as AuthEnv;
  const checks: EnvCheck[] = [];
  const add = (group: SetupGroup, name: string, required: boolean, ok: boolean, hint: string) => checks.push({ name, group, required, ok, hint });

  const id = env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? "";
  add("sheet", "GOOGLE_SHEETS_SPREADSHEET_ID", true, SPREADSHEET_ID.test(id), id ? "Looks wrong: paste only the ID, the part of the Sheet's address between /d/ and /edit." : "The ID of your spreadsheet: the part of its address between /d/ and /edit.");
  add(
    "sheet",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    true,
    key === "ok",
    key === "invalid"
      ? "Set, but not a service account key. Paste the whole JSON file (or base64 of it)."
      : key === "ok"
        ? "A service account key."
        : "The service account's JSON key: paste the whole file here on a host, or point GOOGLE_SERVICE_ACCOUNT_KEY_FILE at it on your own computer.",
  );

  add("signin", "GOOGLE_CLIENT_ID", true, filled(env.GOOGLE_CLIENT_ID), "The OAuth client's ID from Google Cloud (Credentials, Web application).");
  add("signin", "GOOGLE_CLIENT_SECRET", true, filled(env.GOOGLE_CLIENT_SECRET), "That client's secret.");
  const email = allowedEmail(auth);
  add("signin", "ALLOWED_EMAIL", true, /^[^@\s]+@[^@\s]+$/.test(email), email ? "Must be one email address, not a list." : "The one Google address that may sign in.");
  add("signin", "SESSION_SECRET", true, (env.SESSION_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH, `At least ${MIN_SECRET_LENGTH} random characters: run openssl rand -base64 48.`);

  const gmailSet = GMAIL_SETTINGS.filter((name) => filled(env[name]));
  const gmailPartial = gmailSet.length > 0 && gmailSet.length < GMAIL_SETTINGS.length;
  for (const name of GMAIL_SETTINGS) {
    add("gmail", name, false, filled(env[name]), filled(env[name]) ? "Set." : gmailPartial ? "The import needs all five Gmail settings; this one is missing." : "Optional: only for importing statements from Gmail.");
  }

  add("claude", "MCP_ACCESS_TOKEN", false, (env.MCP_ACCESS_TOKEN?.length ?? 0) >= MIN_SECRET_LENGTH, `Optional: at least ${MIN_SECRET_LENGTH} random characters. Without it Claude can't connect.`);
  add("cron", "CRON_SECRET", false, (env.CRON_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH, `Optional: at least ${MIN_SECRET_LENGTH} random characters. Without it the daily sync is off. Leave it unset if you don't use the Gmail import.`);

  add("display", "OWNER_NAME", false, filled(env.OWNER_NAME), "Optional: the name in your greeting. Without it the greeting has no name.");
  add("display", "NEXT_PUBLIC_TIME_ZONE", false, filled(env.NEXT_PUBLIC_TIME_ZONE), "Optional: your time zone, such as America/New_York. Without it, India's.");
  return checks;
}

/** The required settings that aren't right, which is what stops the app from working. */
export function blockingChecks(checks: EnvCheck[]): EnvCheck[] {
  return checks.filter((check) => check.required && !check.ok);
}
