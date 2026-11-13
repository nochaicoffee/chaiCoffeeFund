import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionKey } from "@/lib/auth/config";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { proxy } from "./proxy";

const SECRET = "s".repeat(40);
const TOKEN = "t".repeat(40);

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_PASSWORD", "a long passphrase");
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("MCP_ACCESS_TOKEN", TOKEN);
});
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

  it("lets the login page through, signed out", async () => {
    expect(passedThrough(await proxy(request("/login")))).toBe(true);
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
    vi.stubEnv("APP_PASSWORD", "");
    expect((await proxy(request("/accounts"))).status).toBe(503);
    expect((await proxy(request("/api/accounts"))).status).toBe(503);
  });
});
