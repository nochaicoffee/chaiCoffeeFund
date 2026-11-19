import { describe, expect, it } from "vitest";
import { blockingChecks, envChecks, GMAIL_SETTINGS } from "./envChecks";

const LONG = "x".repeat(40);
const complete = {
  GOOGLE_SHEETS_SPREADSHEET_ID: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "secret",
  ALLOWED_EMAIL: "me@example.com",
  SESSION_SECRET: LONG,
};
const byName = (env: Record<string, string>, key: "ok" | "missing" | "invalid" = "ok") => Object.fromEntries(envChecks(env, key).map((check) => [check.name, check]));

describe("envChecks", () => {
  it("has nothing blocking when the Sheet and sign-in settings are right", () => {
    expect(blockingChecks(envChecks(complete, "ok"))).toEqual([]);
  });

  it("blocks on every required setting that is missing", () => {
    const names = blockingChecks(envChecks({}, "missing")).map((check) => check.name);
    expect(names).toEqual(["GOOGLE_SHEETS_SPREADSHEET_ID", "GOOGLE_SERVICE_ACCOUNT_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ALLOWED_EMAIL", "SESSION_SECRET"]);
  });

  it("says a pasted spreadsheet address is wrong, not just missing", () => {
    const checks = byName({ ...complete, GOOGLE_SHEETS_SPREADSHEET_ID: "https://docs.google.com/spreadsheets/d/abc/edit" });
    expect(checks.GOOGLE_SHEETS_SPREADSHEET_ID.ok).toBe(false);
    expect(checks.GOOGLE_SHEETS_SPREADSHEET_ID.hint).toMatch(/Looks wrong/);
  });

  it("tells a key that isn't a key from one that's absent", () => {
    expect(byName(complete, "invalid").GOOGLE_SERVICE_ACCOUNT_KEY.hint).toMatch(/not a service account key/);
    expect(byName(complete, "missing").GOOGLE_SERVICE_ACCOUNT_KEY.hint).toMatch(/JSON key/);
  });

  it("wants one email, and a long session secret", () => {
    expect(byName({ ...complete, ALLOWED_EMAIL: "a@x.com, b@x.com" }).ALLOWED_EMAIL.ok).toBe(false);
    expect(byName({ ...complete, SESSION_SECRET: "short" }).SESSION_SECRET.ok).toBe(false);
  });

  it("never returns a setting's value", () => {
    const env = { ...complete, GOOGLE_CLIENT_SECRET: "GOCSPX-zzz-unique-9f3", MCP_ACCESS_TOKEN: "TOPSECRETTOKEN-0123456789-0123456789", SESSION_SECRET: "sessionvalue-" + "q".repeat(30) };
    const text = JSON.stringify(envChecks(env, "ok"));
    for (const value of Object.values(env)) expect(text).not.toContain(value);
  });

  it("calls the optional groups optional, and a half-set Gmail group out", () => {
    const checks = envChecks({ ...complete, GMAIL_OAUTH_CLIENT_ID: "id" }, "ok");
    expect(checks.filter((check) => check.group === "gmail")).toHaveLength(GMAIL_SETTINGS.length);
    expect(checks.filter((check) => !check.required && check.group !== "sheet" && check.group !== "signin").every((check) => !check.required)).toBe(true);
    const missing = checks.find((check) => check.name === "GMAIL_OAUTH_CLIENT_SECRET");
    expect(missing?.hint).toMatch(/needs all five/);
    expect(blockingChecks(checks)).toEqual([]);
  });
});
