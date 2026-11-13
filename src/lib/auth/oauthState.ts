import { safeEqual } from "./safeEqual";
import { base64UrlToText, hmac, textToBase64Url } from "./signing";

/** The cookie that carries a sign-in across the trip to Google and back. */
export const OAUTH_COOKIE = "chai_oauth";
/** Only the Google routes see it. */
export const OAUTH_COOKIE_PATH = "/login/google";
/** Ten minutes is plenty to pick an account and come back. */
export const OAUTH_MAX_AGE_SECONDS = 10 * 60;

/** What the callback needs to remember from the start of a sign-in. */
export interface OAuthState {
  /** Echoed back by Google in the callback URL; a callback without it didn't come from this browser's sign-in. */
  state: string;
  /** Must come back inside Google's ID token. */
  nonce: string;
  /** The PKCE secret whose hash was sent to Google. */
  verifier: string;
  /** The page to land on afterwards (already checked by `safeNextPath`). */
  next: string;
}

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/** `OAuthState` as a cookie value: the data, then an HMAC over it, so the browser can't change what it holds. */
export async function sealOAuthState(secret: string, value: OAuthState, now: number = Date.now()): Promise<string> {
  const payload = textToBase64Url(JSON.stringify({ ...value, exp: now + OAUTH_MAX_AGE_SECONDS * 1000 }));
  return `${payload}.${await hmac(secret, `oauth.v1.${payload}`)}`;
}

/** The state a cookie value holds, or null when it is missing, forged, malformed or older than ten minutes. */
export async function openOAuthState(secret: string | undefined, cookie: string | undefined, now: number = Date.now()): Promise<OAuthState | null> {
  if (!secret || !cookie) return null;
  const dot = cookie.indexOf(".");
  if (dot < 1) return null;
  const payload = cookie.slice(0, dot);
  if (!(await safeEqual(cookie.slice(dot + 1), await hmac(secret, `oauth.v1.${payload}`)))) return null;
  const text = base64UrlToText(payload);
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (typeof data.exp !== "number" || data.exp <= now) return null;
    if (!isText(data.state) || !isText(data.nonce) || !isText(data.verifier) || !isText(data.next)) return null;
    return { state: data.state, nonce: data.nonce, verifier: data.verifier, next: data.next };
  } catch {
    return null;
  }
}
