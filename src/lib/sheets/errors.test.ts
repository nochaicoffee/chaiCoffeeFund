import { describe, expect, it } from "vitest";
import { isQuotaError, isTimeoutError, sheetsFailureMessage } from "./errors";

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

describe("isTimeoutError", () => {
  it("recognises the client's own time limit, which the library reports as an aborted request", () => {
    expect(isTimeoutError(Object.assign(new Error("The operation was aborted."), { cause: { name: "AbortError" } }))).toBe(true);
    expect(isTimeoutError({ name: "TimeoutError" })).toBe(true);
    expect(isTimeoutError(new Error("request timed out"))).toBe(true);
  });

  it("leaves other failures alone, a quota refusal included", () => {
    expect(isTimeoutError(new Error("socket hang up"))).toBe(false);
    expect(isTimeoutError({ code: 429 })).toBe(false);
    expect(isTimeoutError(undefined)).toBe(false);
  });

  it("is never told as 'nothing was written', because the request may have landed", () => {
    const message = sheetsFailureMessage(Object.assign(new Error("The operation was aborted."), { cause: { name: "AbortError" } }));
    expect(message).toMatch(/may or may not have been saved/);
    expect(message).not.toMatch(/nothing was written/i);
  });
});
