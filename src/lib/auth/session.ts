import { safeEqual } from "./safeEqual";

/** The signed-in cookie's name. */
export const SESSION_COOKIE = "chai_session";
/** How long a sign-in lasts. It's one person on his own phone and laptop, so a month. */
export const SESSION_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  // The prefix keeps this signature from ever being valid for some other use of the same secret.
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`session.v1.${expiresAt}`));
  return toBase64Url(new Uint8Array(mac));
}

/** A cookie value that says "signed in until `expiresAt`", signed with the server's secret. Nothing is stored server-side. */
export async function createSessionToken(secret: string, now: number = Date.now()): Promise<string> {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${await sign(secret, expiresAt)}`;
}

/** Whether a cookie value is one `createSessionToken` made with this secret, and hasn't run out. */
export async function verifySessionToken(token: string | undefined, secret: string | undefined, now: number = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiresText = token.slice(0, dot);
  if (!/^\d{1,16}$/.test(expiresText)) return false;
  const expiresAt = Number(expiresText);
  if (expiresAt <= now) return false;
  return safeEqual(token.slice(dot + 1), await sign(secret, expiresAt));
}
