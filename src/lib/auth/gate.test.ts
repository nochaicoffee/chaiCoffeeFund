import { describe, expect, it } from "vitest";
import type { AuthEnv } from "./config";
import { allowedEmail, loginConfigured, loginRequired, mcpConfigured, sessionKey } from "./config";
import { bearerToken, decideAccess, hasValidMcpToken, isLoginPath, safeNextPath } from "./gate";
import { createSessionToken } from "./session";

import { hosted, SECRET, TOKEN } from "./google.testutil";

const local: AuthEnv = { NODE_ENV: "development" };
const KEY = sessionKey(hosted)!;

const ask = (pathname: string, env: AuthEnv, extra: { cookie?: string; authorization?: string } = {}) =>
  decideAccess({ pathname, cookie: extra.cookie, authorization: extra.authorization ?? null, env });

describe("config", () => {
  it("requires a login in production, or wherever an allowed address is set", () => {
    expect(loginRequired({ NODE_ENV: "production" })).toBe(true);
    expect(loginRequired({ NODE_ENV: "development" })).toBe(false);
    expect(loginRequired({ NODE_ENV: "development", ALLOWED_EMAIL: "me@example.com" })).toBe(true);
    expect(loginRequired({ NODE_ENV: "development", ALLOWED_EMAIL: "  " })).toBe(false);
  });

  it("needs the Google client, one address and a long enough secret to be configured", () => {
    expect(loginConfigured(hosted)).toBe(true);
    expect(loginConfigured({ ...hosted, GOOGLE_CLIENT_ID: undefined })).toBe(false);
    expect(loginConfigured({ ...hosted, GOOGLE_CLIENT_ID: "  " })).toBe(false);
    expect(loginConfigured({ ...hosted, GOOGLE_CLIENT_SECRET: undefined })).toBe(false);
    expect(loginConfigured({ ...hosted, ALLOWED_EMAIL: undefined })).toBe(false);
    expect(loginConfigured({ ...hosted, ALLOWED_EMAIL: "not-an-address" })).toBe(false);
    expect(loginConfigured({ ...hosted, ALLOWED_EMAIL: "a@b.c, d@e.f" })).toBe(false); // one person, not a list
    expect(loginConfigured({ ...hosted, SESSION_SECRET: "short" })).toBe(false);
    expect(loginConfigured({ ...hosted, SESSION_SECRET: "s".repeat(31) })).toBe(false);
    expect(loginConfigured({ ...hosted, SESSION_SECRET: "s".repeat(32) })).toBe(true);
    expect(mcpConfigured(hosted)).toBe(true);
    expect(mcpConfigured({ MCP_ACCESS_TOKEN: "short" })).toBe(false);
    expect(mcpConfigured({})).toBe(false);
  });

  it("reads the allowed address in lower case, trimmed", () => {
    expect(allowedEmail({ ALLOWED_EMAIL: "  Owner@Example.com " })).toBe("owner@example.com");
    expect(allowedEmail({})).toBe("");
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

  it("signs a session out when the allowed address changes, and when the secret does", async () => {
    const cookie = await createSessionToken(KEY);
    expect(await ask("/accounts", { ...hosted, ALLOWED_EMAIL: "someone.else@example.com" }, { cookie })).toEqual({ action: "login" });
    expect(await ask("/accounts", { ...hosted, ALLOWED_EMAIL: " owner@EXAMPLE.com " }, { cookie })).toEqual({ action: "allow" }); // same address, written differently
    expect(await ask("/accounts", { ...hosted, SESSION_SECRET: "n".repeat(40) }, { cookie })).toEqual({ action: "login" });
    expect(await ask("/accounts", hosted, { cookie })).toEqual({ action: "allow" });
  });

  it("does not take the MCP token as a login, or a cookie as the MCP token", async () => {
    expect(await ask("/api/accounts", hosted, { authorization: `Bearer ${TOKEN}` })).toEqual({ action: "unauthorized" });
    const cookie = await createSessionToken(KEY);
    expect(await ask("/api/mcp", hosted, { cookie })).toEqual({ action: "unauthorized" });
  });

  it("serves the login page and the Google steps under it without a session", async () => {
    for (const path of ["/login", "/login/google", "/login/google/callback"]) expect(await ask(path, hosted)).toEqual({ action: "allow" });
    expect(await ask("/loginx", hosted)).toEqual({ action: "login" }); // only the real paths
    expect(isLoginPath("/login/")).toBe(true);
    expect(isLoginPath("/logout")).toBe(false);
  });

  it("lets a signed-out request reach /logout, so an expired session can still press Sign out", async () => {
    expect(await ask("/logout", hosted)).toEqual({ action: "allow" });
  });

  it("serves nothing when the host has no login set up, instead of everything", async () => {
    expect(await ask("/accounts", { NODE_ENV: "production" })).toEqual({ action: "misconfigured" });
    expect(await ask("/api/accounts", { NODE_ENV: "production", SESSION_SECRET: SECRET, ALLOWED_EMAIL: "owner@example.com" })).toEqual({ action: "misconfigured" }); // no Google client
  });

  it("leaves local development open until an allowed address is set", async () => {
    expect(await ask("/accounts", local)).toEqual({ action: "allow" });
    expect(await ask("/api/accounts", local)).toEqual({ action: "allow" });
    expect(await ask("/accounts", { ...hosted, NODE_ENV: "development" })).toEqual({ action: "login" });
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
      null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "evil", "/login", "/login?next=/", "/login/google", "/login/google/callback", "/logout", "/api/accounts",
      // The URL parser drops tabs and newlines, which would turn these into "//evil.example".
      "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\t\\evil.example",
    ]) {
      expect(safeNextPath(next)).toBe("/");
    }
  });
});
