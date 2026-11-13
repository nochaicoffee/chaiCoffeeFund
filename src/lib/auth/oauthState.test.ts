import { describe, expect, it } from "vitest";
import { openOAuthState, OAUTH_MAX_AGE_SECONDS, sealOAuthState } from "./oauthState";
import { textToBase64Url } from "./signing";

const SECRET = "k".repeat(40);
const value = { state: "st", nonce: "no", verifier: "ve", next: "/accounts?x=1" };

describe("OAuth state cookie", () => {
  it("opens to what was sealed", async () => {
    expect(await openOAuthState(SECRET, await sealOAuthState(SECRET, value))).toEqual(value);
  });

  it("is refused with another secret, an edited payload, or a missing value", async () => {
    const sealed = await sealOAuthState(SECRET, value);
    expect(await openOAuthState("x".repeat(40), sealed)).toBeNull();
    const [, signature] = sealed.split(".");
    const edited = textToBase64Url(JSON.stringify({ ...value, next: "//evil.example", exp: Date.now() + 1e6 }));
    expect(await openOAuthState(SECRET, `${edited}.${signature}`)).toBeNull();
    expect(await openOAuthState(SECRET, undefined)).toBeNull();
    expect(await openOAuthState(undefined, sealed)).toBeNull();
    expect(await openOAuthState(SECRET, "nodot")).toBeNull();
  });

  it("runs out after ten minutes", async () => {
    const now = Date.now();
    const sealed = await sealOAuthState(SECRET, value, now);
    expect(await openOAuthState(SECRET, sealed, now + (OAUTH_MAX_AGE_SECONDS - 1) * 1000)).toEqual(value);
    expect(await openOAuthState(SECRET, sealed, now + OAUTH_MAX_AGE_SECONDS * 1000)).toBeNull();
  });

  it("is not a session cookie, and a session cookie is not this", async () => {
    // Both are HMACs with the same key but different prefixes, so neither opens the other.
    const { createSessionToken, verifySessionToken } = await import("./session");
    expect(await openOAuthState(SECRET, await createSessionToken(SECRET))).toBeNull();
    expect(await verifySessionToken(await sealOAuthState(SECRET, value), SECRET)).toBe(false);
  });
});
