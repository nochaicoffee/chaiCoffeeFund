import { describe, expect, it } from "vitest";
import type { AuthEnv } from "./config";
import { loginConfigured, loginRequired, mcpConfigured, sessionKey } from "./config";
import { bearerToken, decideAccess, hasValidMcpToken, safeNextPath } from "./gate";
import { createSessionToken } from "./session";

const SECRET = "s".repeat(40);
const TOKEN = "t".repeat(40);
const hosted: AuthEnv = { NODE_ENV: "production", APP_PASSWORD: "a long passphrase", SESSION_SECRET: SECRET, MCP_ACCESS_TOKEN: TOKEN };
const local: AuthEnv = { NODE_ENV: "development" };
const KEY = sessionKey(hosted)!;

const ask = (pathname: string, env: AuthEnv, extra: { cookie?: string; authorization?: string } = {}) =>
  decideAccess({ pathname, cookie: extra.cookie, authorization: extra.authorization ?? null, env });

describe("config", () => {
  it("requires a login in production, or wherever a passphrase is set", () => {
    expect(loginRequired({ NODE_ENV: "production" })).toBe(true);
    expect(loginRequired({ NODE_ENV: "development" })).toBe(false);
    expect(loginRequired({ NODE_ENV: "development", APP_PASSWORD: "x" })).toBe(true);
  });

  it("treats a short passphrase or secret as not configured", () => {
    expect(loginConfigured(hosted)).toBe(true);
    expect(loginConfigured({ ...hosted, APP_PASSWORD: "short" })).toBe(false);
    expect(loginConfigured({ ...hosted, APP_PASSWORD: "fifteen chars!!" })).toBe(false); // 15: one under the minimum
    expect(loginConfigured({ ...hosted, APP_PASSWORD: "sixteen chars!!!" })).toBe(true);
    expect(loginConfigured({ ...hosted, SESSION_SECRET: "short" })).toBe(false);
    expect(loginConfigured({ ...hosted, APP_PASSWORD: undefined })).toBe(false);
    expect(mcpConfigured(hosted)).toBe(true);
    expect(mcpConfigured({ MCP_ACCESS_TOKEN: "short" })).toBe(false);
    expect(mcpConfigured({})).toBe(false);
  });
});

describe("bearerToken", () => {
  it("reads the token from a Bearer header, in any case", () => {
    expect(bearerToken("Bearer abc")).toBe("abc");
    expect(bearerToken("bearer   abc ")).toBe("abc");
  });
  it("is null for anything else", () => {
    for (const header of [null, undefined, "", "abc", "Basic abc", "Bearer", "Bearer a b"]) expect(bearerToken(header)).toBeNull();
  });
});

describe("hasValidMcpToken", () => {
  it("accepts only the configured token", async () => {
    expect(await hasValidMcpToken(`Bearer ${TOKEN}`, hosted)).toBe(true);
    expect(await hasValidMcpToken(`Bearer ${TOKEN}x`, hosted)).toBe(false);
    expect(await hasValidMcpToken("Bearer nope", hosted)).toBe(false);
    expect(await hasValidMcpToken(null, hosted)).toBe(false);
  });
  it("accepts nothing when no token is configured, not even an empty one", async () => {
    expect(await hasValidMcpToken("Bearer x", {})).toBe(false);
    expect(await hasValidMcpToken("Bearer ", { MCP_ACCESS_TOKEN: "" })).toBe(false);
  });
});

describe("decideAccess for pages and API routes", () => {
  it("sends a page without a session to the login", async () => {
    expect(await ask("/accounts", hosted)).toEqual({ action: "login" });
    expect(await ask("/", hosted)).toEqual({ action: "login" });
  });

  it("answers an API route without a session with 401, not a redirect", async () => {
    expect(await ask("/api/accounts", hosted)).toEqual({ action: "unauthorized" });
    expect(await ask("/api/statements/sync", hosted)).toEqual({ action: "unauthorized" });
  });

  it("lets a valid session cookie through to both", async () => {
    const cookie = await createSessionToken(KEY);
    expect(await ask("/accounts", hosted, { cookie })).toEqual({ action: "allow" });
    expect(await ask("/api/accounts", hosted, { cookie })).toEqual({ action: "allow" });
  });

  it("refuses a cookie signed with another secret", async () => {
    const cookie = await createSessionToken("x".repeat(40));
    expect(await ask("/accounts", hosted, { cookie })).toEqual({ action: "login" });
  });

  it("signs a session out when the passphrase changes, and when the secret does", async () => {
    const cookie = await createSessionToken(KEY);
    expect(await ask("/accounts", { ...hosted, APP_PASSWORD: "another long passphrase" }, { cookie })).toEqual({ action: "login" });
    expect(await ask("/accounts", { ...hosted, SESSION_SECRET: "n".repeat(40) }, { cookie })).toEqual({ action: "login" });
    expect(await ask("/accounts", hosted, { cookie })).toEqual({ action: "allow" });
  });

  it("does not take the MCP token as a login, or a cookie as the MCP token", async () => {
    expect(await ask("/api/accounts", hosted, { authorization: `Bearer ${TOKEN}` })).toEqual({ action: "unauthorized" });
    const cookie = await createSessionToken(KEY);
    expect(await ask("/api/mcp", hosted, { cookie })).toEqual({ action: "unauthorized" });
  });

  it("serves the login page without a session", async () => {
    expect(await ask("/login", hosted)).toEqual({ action: "allow" });
  });

  it("serves nothing when the host has no login set up, instead of everything", async () => {
    expect(await ask("/accounts", { NODE_ENV: "production" })).toEqual({ action: "misconfigured" });
    expect(await ask("/api/accounts", { NODE_ENV: "production", APP_PASSWORD: "a long passphrase" })).toEqual({ action: "misconfigured" });
  });

  it("leaves local development open until a passphrase is set", async () => {
    expect(await ask("/accounts", local)).toEqual({ action: "allow" });
    expect(await ask("/api/accounts", local)).toEqual({ action: "allow" });
    expect(await ask("/accounts", { ...local, APP_PASSWORD: "a long passphrase", SESSION_SECRET: SECRET })).toEqual({ action: "login" });
  });
});

describe("decideAccess for /api/mcp", () => {
  it("allows the right token and refuses a missing or wrong one", async () => {
    expect(await ask("/api/mcp", hosted, { authorization: `Bearer ${TOKEN}` })).toEqual({ action: "allow" });
    expect(await ask("/api/mcp", hosted)).toEqual({ action: "unauthorized" });
    expect(await ask("/api/mcp", hosted, { authorization: "Bearer wrong" })).toEqual({ action: "unauthorized" });
  });

  it("covers sub-paths too, and not a path that only starts with the same letters", async () => {
    expect(await ask("/api/mcp/x", hosted)).toEqual({ action: "unauthorized" });
    expect(await ask("/api/mcpx", hosted)).toEqual({ action: "unauthorized" }); // an ordinary API route: needs the cookie
  });

  it("is off when no token is set, even in local development", async () => {
    expect(await ask("/api/mcp", { ...hosted, MCP_ACCESS_TOKEN: undefined })).toEqual({ action: "mcp-disabled" });
    expect(await ask("/api/mcp", local, { authorization: "Bearer anything" })).toEqual({ action: "mcp-disabled" });
  });

  it("works in local development when a token is set", async () => {
    expect(await ask("/api/mcp", { ...local, MCP_ACCESS_TOKEN: TOKEN }, { authorization: `Bearer ${TOKEN}` })).toEqual({ action: "allow" });
  });
});

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/subscriptions")).toBe("/subscriptions");
    expect(safeNextPath("/accounts?x=1")).toBe("/accounts?x=1");
    expect(safeNextPath("/loans/installments")).toBe("/loans/installments");
  });
  it("falls back to the home page for anything that could leave the site or loop", () => {
    for (const next of [
      null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "evil", "/login", "/login?next=/", "/api/accounts",
      // The URL parser drops tabs and newlines, which would turn these into "//evil.example".
      "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\t\\evil.example",
    ]) {
      expect(safeNextPath(next)).toBe("/");
    }
  });
});
