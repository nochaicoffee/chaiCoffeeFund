const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The bytes of a base64url string, or null when it isn't one. */
export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

export function textToBase64Url(text: string): string {
  return toBase64Url(encoder.encode(text));
}

export function base64UrlToText(text: string): string | null {
  const bytes = fromBase64Url(text);
  return bytes ? decoder.decode(bytes) : null;
}

/** A random string, as base64url. 32 bytes is 256 bits: enough that nobody guesses it. */
export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/**
 * HMAC-SHA256 of a message, as base64url. Each use puts its own prefix on the message
 * ("session.v1.", "oauth.v1."), so a signature made for one purpose is never valid for another
 * even though they share a secret.
 */
export async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message))));
}
