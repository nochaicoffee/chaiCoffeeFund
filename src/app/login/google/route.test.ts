import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionKey } from "@/lib/auth/config";
import { pkceChallenge } from "@/lib/auth/google";
import { CLIENT_ID, stubHostedEnv } from "@/lib/auth/google.testutil";
import { OAUTH_COOKIE, openOAuthState } from "@/lib/auth/oauthState";
import { GET } from "./route";

beforeEach(() => stubHostedEnv((name, value) => vi.stubEnv(name, value)));
afterEach(() => vi.unstubAllEnvs());

const start = (query = "") => GET(new Request(`https://app.example/login/google${query}`));

describe("GET /login/google", () => {
  it("sends him to Google, naming this app, the callback here and a PKCE challenge", async () => {
    const res = await start();
    expect(res.status).toBe(303);
    const to = new URL(res.headers.get("location") ?? "");
    expect(to.origin + to.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(to.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(to.searchParams.get("redirect_uri")).toBe("https://app.example/login/google/callback");
    expect(to.searchParams.get("code_challenge_method")).toBe("S256");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps the state, nonce, verifier and return page in a signed, http-only cookie only the Google routes see", async () => {
    const res = await start("?next=/loans");
    const to = new URL(res.headers.get("location") ?? "");
    const cookie = res.cookies.get(OAUTH_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/login/google", maxAge: 600 });
    const sealed = await openOAuthState(sessionKey(process.env), cookie?.value);
    expect(sealed).toMatchObject({ next: "/loans" });
    // What Google is sent matches what the cookie remembers, and the verifier itself is never sent.
    expect(to.searchParams.get("state")).toBe(sealed?.state);
    expect(to.searchParams.get("nonce")).toBe(sealed?.nonce);
    expect(to.searchParams.get("code_challenge")).toBe(await pkceChallenge(sealed?.verifier ?? ""));
    expect(to.toString()).not.toContain(sealed?.verifier ?? "unreachable");
  });

  it("uses fresh secrets for every sign-in", async () => {
    const a = new URL((await start()).headers.get("location") ?? "").searchParams;
    const b = new URL((await start()).headers.get("location") ?? "").searchParams;
    expect(a.get("state")).not.toBe(b.get("state"));
    expect(a.get("nonce")).not.toBe(b.get("nonce"));
  });

  it("returns home rather than to a page that would leave the site", async () => {
    const res = await start("?next=//evil.example");
    expect((await openOAuthState(sessionKey(process.env), res.cookies.get(OAUTH_COOKIE)?.value))?.next).toBe("/");
  });

  it("goes back to the login page, setting nothing, when the host has no login set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const res = await start();
    expect(res.headers.get("location")).toBe("https://app.example/login");
    expect(res.cookies.get(OAUTH_COOKIE)).toBeUndefined();
  });
});
