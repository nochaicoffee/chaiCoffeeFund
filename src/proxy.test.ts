import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionKey } from "@/lib/auth/config";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { stubHostedEnv, TOKEN } from "@/lib/auth/google.testutil";
import { proxy } from "./proxy";

beforeEach(() => stubHostedEnv((name, value) => vi.stubEnv(name, value)));
afterEach(() => vi.unstubAllEnvs());

const request = (path: string, headers: Record<string, string> = {}) => new NextRequest(`https://app.example${path}`, { headers });
/** NextResponse.next() marks itself with this header; anything else is a response from the proxy. */
const passedThrough = (response: Response) => response.headers.get("x-middleware-next") === "1";

describe("proxy", () => {
  it("sends a signed-out page request to the login, remembering where it was going", async () => {
    const res = await proxy(request("/subscriptions?x=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.example/login?next=%2Fsubscriptions%3Fx%3D1");
  });

  it("turns a signed-out POST into a GET of /login, so it doesn't hit a page that only answers GET", async () => {
    const res = await proxy(new NextRequest("https://app.example/subscriptions", { method: "POST" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/login?next=");
  });

  it("lets a signed-out POST to /logout through", async () => {
    expect(passedThrough(await proxy(new NextRequest("https://app.example/logout", { method: "POST" })))).toBe(true);
  });

  it("sends the home page to a bare /login", async () => {
    expect((await proxy(request("/"))).headers.get("location")).toBe("https://app.example/login");
  });

  it("answers a signed-out API request with 401 JSON and sends no data", async () => {
    const res = await proxy(request("/api/accounts"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("lets a signed-in request through", async () => {
    const cookie = `${SESSION_COOKIE}=${await createSessionToken(sessionKey(process.env)!)}`;
    expect(passedThrough(await proxy(request("/accounts", { cookie })))).toBe(true);
    expect(passedThrough(await proxy(request("/api/accounts", { cookie })))).toBe(true);
  });

  it("lets the login page and the Google steps through, signed out", async () => {
    for (const path of ["/login", "/login/google", "/login/google/callback?code=x&state=y"]) expect(passedThrough(await proxy(request(path)))).toBe(true);
  });

  it("takes the bearer token for /api/mcp and refuses it elsewhere", async () => {
    const authorization = `Bearer ${TOKEN}`;
    expect(passedThrough(await proxy(request("/api/mcp", { authorization })))).toBe(true);
    expect((await proxy(request("/api/mcp"))).status).toBe(401);
    expect((await proxy(request("/api/accounts", { authorization }))).status).toBe(401);
    expect((await proxy(request("/accounts", { authorization }))).status).toBe(307);
  });

  it("turns /api/mcp off with a 503 when no token is set", async () => {
    vi.stubEnv("MCP_ACCESS_TOKEN", "");
    expect((await proxy(request("/api/mcp", { authorization: `Bearer ${TOKEN}` }))).status).toBe(503);
  });

  it("serves nothing, with a 503, when the login isn't set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    expect((await proxy(request("/accounts"))).status).toBe(503);
    expect((await proxy(request("/api/accounts"))).status).toBe(503);
  });
});
