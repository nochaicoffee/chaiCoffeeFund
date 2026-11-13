/** The environment variables the login and the MCP endpoint read. All set in Vercel's settings, never in the repo. */
export interface AuthEnv {
  NODE_ENV?: string;
  /** The passphrase that signs in to the pages. */
  APP_PASSWORD?: string;
  /** Signs the session cookie. Long and random: `openssl rand -base64 48`. */
  SESSION_SECRET?: string;
  /** The bearer token Claude's connector sends to /api/mcp. Long and random. */
  MCP_ACCESS_TOKEN?: string;
}

/** A secret shorter than this is as good as none. */
export const MIN_SECRET_LENGTH = 32;
/**
 * Long on purpose: the login has no lockout (a pause only slows one client, not parallel guesses),
 * so the passphrase itself has to be too long to guess.
 */
export const MIN_PASSWORD_LENGTH = 16;

/**
 * Whether the pages need a login. Always in a production build, so a host that forgot to set
 * the variables serves nothing instead of everything. Locally (`next dev`) it's off unless
 * APP_PASSWORD is set, so working on the app is unchanged.
 */
export function loginRequired(env: AuthEnv): boolean {
  return env.NODE_ENV === "production" || Boolean(env.APP_PASSWORD);
}

/** Whether the login can work: a passphrase and a secret to sign the cookie with. */
export function loginConfigured(env: AuthEnv): boolean {
  return (env.APP_PASSWORD?.length ?? 0) >= MIN_PASSWORD_LENGTH && (env.SESSION_SECRET?.length ?? 0) >= MIN_SECRET_LENGTH;
}

/** Whether the MCP endpoint has a token to check against. Without one it's off, in every environment. */
export function mcpConfigured(env: AuthEnv): boolean {
  return (env.MCP_ACCESS_TOKEN?.length ?? 0) >= MIN_SECRET_LENGTH;
}

/**
 * What the session cookie is signed with: the secret and the passphrase together, so changing
 * either one signs every device out. A leaked passphrase is fixed by changing it, with no need
 * to know SESSION_SECRET had anything to do with it. Undefined when the login isn't configured.
 */
export function sessionKey(env: AuthEnv): string | undefined {
  return loginConfigured(env) ? `${env.SESSION_SECRET}\n${env.APP_PASSWORD}` : undefined;
}
