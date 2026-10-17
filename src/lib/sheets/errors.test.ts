import { describe, expect, it } from "vitest";
import { isQuotaError, sheetsFailureMessage } from "./errors";

describe("isQuotaError", () => {
  it("recognises Google's quota refusal by its status or its message", () => {
    expect(isQuotaError({ code: 429 })).toBe(true);
    expect(isQuotaError({ status: 429 })).toBe(true);
    expect(isQuotaError(new Error("Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'"))).toBe(true);
  });

  it("leaves other failures alone", () => {
    expect(isQuotaError(new Error("socket hang up"))).toBe(false);
    expect(isQuotaError({ code: 403 })).toBe(false);
    expect(isQuotaError(undefined)).toBe(false);
  });
});

describe("sheetsFailureMessage", () => {
  it("says to wait a minute for the quota, and to try again otherwise, without the raw error", () => {
    expect(sheetsFailureMessage({ code: 429 })).toMatch(/Try again in a minute/);
    const other = sheetsFailureMessage(new Error("ECONNRESET 10.0.0.1"));
    expect(other).toBe("Couldn't save to the Sheet, so nothing was written. Try again.");
    expect(other).not.toContain("ECONNRESET");
  });
});
