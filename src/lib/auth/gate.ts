import { cronConfigured, loginConfigured, loginRequired, mcpConfigured, sessionKey, type AuthEnv } from "./config";
import { safeEqual } from "./safeEqual";
import { verifySessionToken } from "./session";

/** What the proxy does with a request. */
export type Access =
  | { action: "allow" }
  /** Send a page request to the login. */
  | { action: "login" }
  /** An API or MCP request without a valid credential. */
  | { action: "unauthorized" }
  /** The host has no login set up, so nothing is served. */
  | { action: "misconfigured" }
  /** /api/mcp has no token set, so it's off. */
  | { action: "mcp-disabled" }
  /** /api/cron/* has no CRON_SECRET set, so it's off. */
  | { action: "cron-disabled" };

export const MCP_PATH = "/api/mcp";
export const CRON_PATH = "/api/cron";
export const LOGIN_PATH = "/login";
export const LOGOUT_PATH = "/logout";
/** The setup guide: open to anyone, because on a fresh deploy nobody can sign in yet (its live checklist is for the signed-in only). */
export const SETUP_PATH = "/setup";

/** The sign-in page and the Google steps under it (/login/google, /login/google/callback): open to someone signed out. */
export function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

/** The guide page only. /api/setup/* changes the Sheet's structure, so it needs the session like every other API route. */
export function isSetupPath(pathname: string): boolean {
  return pathname === SETUP_PATH || pathname === `${SETUP_PATH}/`;
}

export function isMcpPath(pathname: string): boolean {
  return pathname === MCP_PATH || pathname.startsWith(`${MCP_PATH}/`);
}

export function isCronPath(pathname: string): boolean {
  return pathname === CRON_PATH || pathname.startsWith(`${CRON_PATH}/`);
}

/** The token from an `Authorization: Bearer …` header, if it has that shape. */
export function bearerToken(header: string | null | undefined): string | null {
  const match = /^bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
  return match ? match[1] : null;
}

/** Whether the header carries this secret. False when none is set, so an empty secret never matches an empty header. */
async function carriesSecret(header: string | null | undefined, secret: string | undefined, configured: boolean): Promise<boolean> {
  const token = bearerToken(header);
  if (!token || !configured || !secret) return false;
  return safeEqual(token, secret);
}

/** Whether the header carries the MCP token. */
export function hasValidMcpToken(header: string | null | undefined, env: AuthEnv): Promise<boolean> {
  return carriesSecret(header, env.MCP_ACCESS_TOKEN, mcpConfigured(env));
}

/** Whether the header carries CRON_SECRET, which is what Vercel Cron sends as `Authorization: Bearer …`. */
export function hasValidCronSecret(header: string | null | undefined, env: AuthEnv): Promise<boolean> {
  return carriesSecret(header, env.CRON_SECRET, cronConfigured(env));
}

export interface AccessRequest {
  pathname: string;
  /** The session cookie's value. */
  cookie: string | undefined;
  authorization: string | null;
  env: AuthEnv;
  now?: number;
}

/**
 * Who may see what. The pages and every other API route take the session cookie from the
 * login; /api/mcp takes only its bearer token, because Claude's connector can't sign in
 * through a page, and /api/cron/* takes only CRON_SECRET, because Vercel Cron can't either.
 * Pure, so it's tested without a server (proxy.ts only turns the answer into a response).
 */
export async function decideAccess({ pathname, cookie, authorization, env, now }: AccessRequest): Promise<Access> {
  if (isMcpPath(pathname)) {
    if (!mcpConfigured(env)) return { action: "mcp-disabled" };
    return (await hasValidMcpToken(authorization, env)) ? { action: "allow" } : { action: "unauthorized" };
  }
  // Signing out needs no session: clearing a cookie gives nothing away, and an expired session must still be able to press Sign out.
  if (isCronPath(pathname)) {
    if (!cronConfigured(env)) return { action: "cron-disabled" };
    return (await hasValidCronSecret(authorization, env)) ? { action: "allow" } : { action: "unauthorized" };
  }
  if (isLoginPath(pathname) || pathname === LOGOUT_PATH || isSetupPath(pathname)) return { action: "allow" };
  if (!loginRequired(env)) return { action: "allow" };
  if (!loginConfigured(env)) return { action: "misconfigured" };
  if (await verifySessionToken(cookie, sessionKey(env), now)) return { action: "allow" };
  return pathname.startsWith("/api/") ? { action: "unauthorized" } : { action: "login" };
}

/** Any origin will do for resolving a path: it is only compared with itself. */
const PLACEHOLDER_ORIGIN = "https://site.invalid";

/**
 * Where to go after signing in: only a path on this site, so the login can't send someone
 * elsewhere. It's resolved with the same URL parser the redirect uses, because that parser
 * drops tabs and newlines ("/\t/evil.example" becomes "//evil.example") and reads "\" as "/",
 * which a check on the text alone misses.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(next, PLACEHOLDER_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return "/";
  // /logout only answers POST, so landing on it after signing in would be a 405.
  if (isLoginPath(url.pathname) || url.pathname === LOGOUT_PATH || url.pathname.startsWith("/api/")) return "/";
  return url.pathname + url.search;
}
