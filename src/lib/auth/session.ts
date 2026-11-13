import { safeEqual } from "./safeEqual";
import { hmac } from "./signing";

/** The signed-in cookie's name. */
export const SESSION_COOKIE = "chai_session";
/** How long a sign-in lasts. It's one person on his own phone and laptop, so a month. */
export const SESSION_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

async function sign(secret: string, expiresAt: number): Promise<string> {
  return hmac(secret, `session.v1.${expiresAt}`);
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
