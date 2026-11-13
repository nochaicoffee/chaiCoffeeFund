import { base64UrlToText, toBase64Url } from "./signing";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
/** Where Google sends him back. Registered in Google Cloud as an authorized redirect URI, once per host. */
export const CALLBACK_PATH = "/login/google/callback";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

/** PKCE: the SHA-256 of the verifier, so a stolen authorization code is useless without the verifier kept in the cookie. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

export interface AuthorizationParams {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
}

/** The Google page that asks which account to sign in with. Only the address (`openid email`) is requested, nothing else of his. */
export function authorizationUrl({ clientId, redirectUri, state, nonce, challenge }: AuthorizationParams): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** The claims inside a JWT, without checking its signature (see `exchangeCode` for why that's allowed here). Null when it isn't a JWT. */
export function decodeIdToken(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const text = base64UrlToText(parts[1]);
  if (!text) return null;
  try {
    const claims: unknown = JSON.parse(text);
    return claims && typeof claims === "object" && !Array.isArray(claims) ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export interface IdTokenExpectations {
  clientId: string;
  nonce: string;
  /** The one address allowed in, already lower-cased. */
  allowedEmail: string;
  now?: number;
}

/**
 * Whether Google's ID token says the allowed person signed in just now, to this app.
 * "denied" is a real Google account that isn't his; "failed" is a token that doesn't add up.
 * Pure, so every wrong case is tested without Google.
 */
export function checkIdToken(claims: Record<string, unknown> | null, { clientId, nonce, allowedEmail, now = Date.now() }: IdTokenExpectations): { ok: true } | { ok: false; reason: "denied" | "failed" } {
  if (!claims) return { ok: false, reason: "failed" };
  const { iss, aud, exp, nonce: claimedNonce, email, email_verified: verified } = claims;
  if (typeof iss !== "string" || !GOOGLE_ISSUERS.includes(iss)) return { ok: false, reason: "failed" };
  if (aud !== clientId) return { ok: false, reason: "failed" };
  if (typeof exp !== "number" || exp * 1000 <= now) return { ok: false, reason: "failed" };
  if (claimedNonce !== nonce) return { ok: false, reason: "failed" };
  // An address Google hasn't verified is only a claim; an unset allowed address matches nothing.
  if (typeof email !== "string" || (verified !== true && verified !== "true")) return { ok: false, reason: "denied" };
  return allowedEmail && email.trim().toLowerCase() === allowedEmail ? { ok: true } : { ok: false, reason: "denied" };
}

export interface CodeExchange {
  code: string;
  verifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Trades the one-time code Google put in the callback for the signed-in person's ID token. The
 * call goes from this server to Google over TLS with the client secret, so the token comes
 * straight from Google and can be trusted without checking its signature (OpenID Connect Core,
 * "ID Token Validation": the TLS check stands in for it). Null on any failure, so the caller
 * can only ever answer "didn't work", with nothing from Google's reply passed on.
 */
export async function exchangeCode({ code, verifier, clientId, clientSecret, redirectUri }: CodeExchange): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const idToken = (body as { id_token?: unknown } | null)?.id_token;
    return typeof idToken === "string" ? idToken : null;
  } catch {
    return null;
  }
}
