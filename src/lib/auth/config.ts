/** The environment variables the login and the MCP endpoint read. All set in Vercel's settings, never in the repo. */
export interface AuthEnv {
  NODE_ENV?: string;
  /** The OAuth client ID from Google Cloud (Credentials, "Web application"). */
  GOOGLE_CLIENT_ID?: string;
  /** That client's secret. */
  GOOGLE_CLIENT_SECRET?: string;
  /** The one Google account that may sign in. Anyone else Google confirms is still refused. */
  ALLOWED_EMAIL?: string;
  /** Signs the session cookie. Long and random: `openssl rand -base64 48`. */
  SESSION_SECRET?: string;
  /** The bearer token Claude's connector sends to /api/mcp. Long and random. */
  MCP_ACCESS_TOKEN?: string;
}

/** A secret shorter than this is as good as none. */
export const MIN_SECRET_LENGTH = 32;

/** The address that may sign in, trimmed and lower-cased so the comparison with Google's answer is exact. */
export function allowedEmail(env: AuthEnv): string {
  return env.ALLOWED_EMAIL?.trim().toLowerCase() ?? "";
}

/**
 * Whether the pages need a login. Always in a production build, so a host that forgot to set
 * the variables serves nothing instead of everything. Locally (`next dev`) it's off unless
 * ALLOWED_EMAIL is set, so working on the app is unchanged.
 */
export function loginRequired(env: AuthEnv): boolean {
  return env.NODE_ENV === "production" || allowedEmail(env) !== "";
}

/** Whether the login can work: a Google client, one address that may sign in, and a secret to sign the cookie with. */
export function loginConfigured(env: AuthEnv): boolean {
  return (
    Boolean(env.GOOGLE_CLIENT_ID?.trim()) &&
    Boolean(env.GOOGLE_CLIENT_SECRET?.trim()) &&
    /^[^@\s]+@[^@\s]+$/.test(allowedEmail(env)) &&
    (env.SESSION_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH
  );
}

/** Whether the MCP endpoint has a token to check against. Without one it's off, in every environment. */
export function mcpConfigured(env: AuthEnv): boolean {
  return (env.MCP_ACCESS_TOKEN?.length ?? 0) >= MIN_SECRET_LENGTH;
}

/**
 * What the session cookie and the sign-in's state cookie are signed with: the secret and the
 * allowed address together, so changing either one signs every device out. Undefined when the
 * login isn't configured.
 */
export function sessionKey(env: AuthEnv): string | undefined {
  return loginConfigured(env) ? `${env.SESSION_SECRET}\n${allowedEmail(env)}` : undefined;
}
