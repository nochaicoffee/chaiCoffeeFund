import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionKey } from "@/lib/auth/config";
import { CLIENT_ID, fakeIdToken, goodClaims, hosted, stubHostedEnv } from "@/lib/auth/google.testutil";
import { OAUTH_COOKIE, sealOAuthState } from "@/lib/auth/oauthState";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { GET } from "./route";

const sealed = { state: "state-1", nonce: "nonce-1", verifier: "verifier-1", next: "/subscriptions" };

/** What Google's token endpoint answers; each test sets it. */
let tokenReply: Response | Error;
const fetchMock = vi.fn(async () => {
  if (tokenReply instanceof Error) throw tokenReply;
  return tokenReply;
});
const answerWith = (claims: Record<string, unknown> | null) => (tokenReply = new Response(JSON.stringify({ id_token: claims ? fakeIdToken(claims) : "junk" })));

beforeEach(() => {
  stubHostedEnv((name, value) => vi.stubEnv(name, value));
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  answerWith(goodClaims(sealed.nonce));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** The callback as Google calls it: a GET with the code and state, and this browser's cookie. */
async function callback(query: Record<string, string>, cookie: string | null | undefined = undefined) {
  const value = cookie === undefined ? await sealOAuthState(sessionKey(hosted) ?? "", sealed) : cookie;
  const url = `https://app.example/login/google/callback?${new URLSearchParams(query)}`;
  return GET(new NextRequest(url, { headers: value ? { cookie: `${OAUTH_COOKIE}=${value}` } : {} }));
}
const good = { code: "code-1", state: sealed.state };
const failedTo = (res: Response, error: string, next = "") => expect(res.headers.get("location")).toBe(`https://app.example/login?error=${error}${next}`);

describe("GET /login/google/callback", () => {
  it("signs the allowed person in: a signed session cookie, and on to the page he asked for", async () => {
    const res = await callback(good);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example/subscriptions");
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(await verifySessionToken(cookie?.value, sessionKey(process.env))).toBe(true);
    expect(res.cookies.get(OAUTH_COOKIE)).toMatchObject({ value: "", maxAge: 0 }); // used once
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("trades the code with Google, with the secret and the verifier from the cookie", async () => {
    await callback(good);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = Object.fromEntries(init.body as URLSearchParams);
    expect(body).toMatchObject({ code: "code-1", client_id: CLIENT_ID, client_secret: "client-secret", code_verifier: "verifier-1", redirect_uri: "https://app.example/login/google/callback" });
  });

  it("refuses a Google account that isn't his, setting no session, and keeps the page for the next try", async () => {
    answerWith({ ...goodClaims(sealed.nonce), email: "stranger@example.com" });
    const res = await callback(good);
    failedTo(res, "denied", "&next=%2Fsubscriptions");
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    expect(res.cookies.get(OAUTH_COOKIE)).toMatchObject({ maxAge: 0 });
  });

  it("refuses an address Google hasn't verified", async () => {
    answerWith({ ...goodClaims(sealed.nonce), email_verified: false });
    expect(((await callback(good)).headers.get("location") ?? "")).toContain("error=denied");
  });

  it("refuses a token meant for another sign-in, another app, or that has run out", async () => {
    for (const claims of [{ nonce: "someone-elses" }, { aud: "another-client" }, { exp: 1 }]) {
      answerWith({ ...goodClaims(sealed.nonce), ...claims });
      const res = await callback(good);
      failedTo(res, "failed", "&next=%2Fsubscriptions");
      expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    }
  });

  it("refuses when the state in the address isn't the one this browser started, without asking Google anything", async () => {
    failedTo(await callback({ code: "code-1", state: "forged" }), "failed");
    failedTo(await callback({ code: "code-1" }), "failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses without this browser's cookie, with a forged one, or with one for another host's secret", async () => {
    const res = await callback(good, null);
    failedTo(res, "failed");
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    failedTo(await callback(good, `${btoa("{}")}.forged`), "failed");
    failedTo(await callback(good, await sealOAuthState("x".repeat(40), sealed)), "failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a cookie that has run out", async () => {
    const old = await sealOAuthState(sessionKey(hosted) ?? "", sealed, Date.now() - 11 * 60 * 1000);
    failedTo(await callback(good, old), "failed");
  });

  it("says cancelled when he presses Cancel on Google's page, and failed when no code comes", async () => {
    failedTo(await callback({ error: "access_denied", state: sealed.state }), "cancelled", "&next=%2Fsubscriptions");
    failedTo(await callback({ state: sealed.state }), "failed", "&next=%2Fsubscriptions");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails, with no session, when Google refuses the code, sends junk, or can't be reached", async () => {
    for (const reply of [new Response("{}", { status: 400 }), new Response(JSON.stringify({ id_token: "junk" })), new Error("offline")]) {
      tokenReply = reply;
      const res = await callback(good);
      failedTo(res, "failed", "&next=%2Fsubscriptions");
      expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
    }
  });

  it("goes back to the login page, without calling Google, when the host has no login set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    const res = await callback(good);
    expect(res.headers.get("location")).toBe("https://app.example/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
