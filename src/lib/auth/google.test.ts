import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizationUrl, checkIdToken, decodeIdToken, exchangeCode, GOOGLE_TOKEN_URL, pkceChallenge } from "./google";
import { CLIENT_ID, fakeIdToken, goodClaims } from "./google.testutil";

const expectations = { clientId: CLIENT_ID, nonce: "n1", allowedEmail: "owner@example.com" };
const now = Date.now();
const check = (claims: Record<string, unknown> | null) => checkIdToken(claims, { ...expectations, now });

describe("pkceChallenge", () => {
  it("is the base64url SHA-256 of the verifier (RFC 7636's own example)", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("authorizationUrl", () => {
  it("asks for the address only, with PKCE and the state and nonce", () => {
    const url = new URL(authorizationUrl({ clientId: CLIENT_ID, redirectUri: "https://app.example/login/google/callback", state: "st", nonce: "no", challenge: "ch" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: "https://app.example/login/google/callback",
      response_type: "code",
      scope: "openid email",
      state: "st",
      nonce: "no",
      code_challenge: "ch",
      code_challenge_method: "S256",
      prompt: "select_account",
    });
  });
});

describe("decodeIdToken", () => {
  it("reads the claims of a JWT", () => {
    expect(decodeIdToken(fakeIdToken({ email: "a@b.c" }))).toEqual({ email: "a@b.c" });
  });
  it("is null for anything that isn't one", () => {
    for (const bad of ["", "abc", "a.b", "a.b.c.d", "a.!!!.c", `a.${btoa("not json")}.c`, `a.${btoa("[1]")}.c`, `a.${btoa("null")}.c`]) expect(decodeIdToken(bad)).toBeNull();
  });
});

describe("checkIdToken", () => {
  it("accepts the allowed person, in any case and with spaces around the address", () => {
    expect(check(goodClaims("n1", now))).toEqual({ ok: true });
    expect(check({ ...goodClaims("n1", now), email: "  OWNER@example.COM " })).toEqual({ ok: true });
    expect(check({ ...goodClaims("n1", now), iss: "accounts.google.com" })).toEqual({ ok: true });
    expect(check({ ...goodClaims("n1", now), email_verified: "true" })).toEqual({ ok: true });
  });

  it("denies another Google account, an address Google hasn't verified, and no address at all", () => {
    expect(check({ ...goodClaims("n1", now), email: "someone@else.com" })).toEqual({ ok: false, reason: "denied" });
    expect(check({ ...goodClaims("n1", now), email: "owner@example.com.evil.com" })).toEqual({ ok: false, reason: "denied" });
    expect(check({ ...goodClaims("n1", now), email_verified: false })).toEqual({ ok: false, reason: "denied" });
    expect(check({ ...goodClaims("n1", now), email_verified: undefined })).toEqual({ ok: false, reason: "denied" });
    expect(check({ ...goodClaims("n1", now), email: undefined })).toEqual({ ok: false, reason: "denied" });
  });

  it("denies everyone when no address is allowed, even one with no address", () => {
    expect(checkIdToken(goodClaims("n1", now), { ...expectations, allowedEmail: "", now })).toEqual({ ok: false, reason: "denied" });
    expect(checkIdToken({ ...goodClaims("n1", now), email: "" }, { ...expectations, allowedEmail: "", now })).toEqual({ ok: false, reason: "denied" });
  });

  it("fails a token for another app, from another issuer, expired, or for another sign-in", () => {
    for (const change of [{ aud: "another-client" }, { iss: "https://evil.example" }, { iss: undefined }, { exp: Math.floor(now / 1000) - 1 }, { exp: "soon" }, { nonce: "other" }, { nonce: undefined }]) {
      expect(check({ ...goodClaims("n1", now), ...change })).toEqual({ ok: false, reason: "failed" });
    }
    expect(check(null)).toEqual({ ok: false, reason: "failed" });
  });
});

describe("exchangeCode", () => {
  const request = { code: "the-code", verifier: "v", clientId: CLIENT_ID, clientSecret: "client-secret", redirectUri: "https://app.example/login/google/callback" };
  afterEach(() => vi.unstubAllGlobals());

  it("posts the code with the secret and the PKCE verifier, and returns the ID token", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id_token: "jwt", access_token: "ignored" })));
    vi.stubGlobal("fetch", fetchMock);
    expect(await exchangeCode(request)).toBe("jwt");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GOOGLE_TOKEN_URL);
    expect(init.method).toBe("POST");
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      code: "the-code",
      client_id: CLIENT_ID,
      client_secret: "client-secret",
      redirect_uri: "https://app.example/login/google/callback",
      grant_type: "authorization_code",
      code_verifier: "v",
    });
  });

  it("is null when Google refuses, answers with something else, or can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })));
    expect(await exchangeCode(request)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id_token: 7 }))));
    expect(await exchangeCode(request)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>")));
    expect(await exchangeCode(request)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await exchangeCode(request)).toBeNull();
  });
});
