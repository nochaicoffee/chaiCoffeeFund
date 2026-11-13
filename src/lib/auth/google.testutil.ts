import type { AuthEnv } from "./config";
import { textToBase64Url } from "./signing";

export const CLIENT_ID = "client-123.apps.googleusercontent.com";
export const SECRET = "s".repeat(40);
export const TOKEN = "t".repeat(40);
/** Upper case on purpose: the comparison with Google's lower-case address must not care. */
export const ALLOWED = "Owner@Example.com";

/** A configured production host, as the tests of the login and the gate see it. */
export const hosted: AuthEnv = {
  NODE_ENV: "production",
  GOOGLE_CLIENT_ID: CLIENT_ID,
  GOOGLE_CLIENT_SECRET: "client-secret",
  ALLOWED_EMAIL: ALLOWED,
  SESSION_SECRET: SECRET,
  MCP_ACCESS_TOKEN: TOKEN,
};

/** Puts `hosted` into process.env (call inside beforeEach; pair with vi.unstubAllEnvs). */
export function stubHostedEnv(stub: (name: string, value: string) => void, env: AuthEnv = hosted): void {
  for (const [name, value] of Object.entries(env)) if (value !== undefined) stub(name, value);
}

/** What Google's ID token says for a good sign-in by the allowed person; tests change one claim at a time. */
export function goodClaims(nonce: string, now = Date.now()): Record<string, unknown> {
  return { iss: "https://accounts.google.com", aud: CLIENT_ID, exp: Math.floor(now / 1000) + 3600, nonce, email: "owner@example.com", email_verified: true };
}

/** A JWT with these claims. The signature is junk: the app doesn't check it (see `exchangeCode`). */
export function fakeIdToken(claims: Record<string, unknown>): string {
  return `${textToBase64Url(JSON.stringify({ alg: "RS256" }))}.${textToBase64Url(JSON.stringify(claims))}.signature`;
}
