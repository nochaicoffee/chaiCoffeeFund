import { describe, expect, it } from "vitest";
import { safeEqual } from "./safeEqual";
import { createSessionToken, SESSION_MAX_AGE_SECONDS, verifySessionToken } from "./session";

const SECRET = "s".repeat(40);
const NOW = Date.UTC(2026, 10, 13);

describe("safeEqual", () => {
  it("is true for equal strings and false for any difference, including length", async () => {
    expect(await safeEqual("pass", "pass")).toBe(true);
    expect(await safeEqual("pass", "Pass")).toBe(false);
    expect(await safeEqual("pass", "pass ")).toBe(false);
    expect(await safeEqual("", "x")).toBe(false);
    expect(await safeEqual("", "")).toBe(true);
  });
});

describe("session tokens", () => {
  it("verify with the secret they were made with", async () => {
    expect(await verifySessionToken(await createSessionToken(SECRET, NOW), SECRET, NOW + 1000)).toBe(true);
  });

  it("run out after the session length, and not before", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const end = NOW + SESSION_MAX_AGE_SECONDS * 1000;
    expect(await verifySessionToken(token, SECRET, end - 1)).toBe(true);
    expect(await verifySessionToken(token, SECRET, end)).toBe(false);
  });

  it("fail under another secret", async () => {
    expect(await verifySessionToken(await createSessionToken(SECRET, NOW), "x".repeat(40), NOW)).toBe(false);
  });

  it("fail when the expiry is stretched, since the signature covers it", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const signature = token.slice(token.indexOf(".") + 1);
    const forged = `${NOW + SESSION_MAX_AGE_SECONDS * 1000 * 100}.${signature}`;
    expect(await verifySessionToken(forged, SECRET, NOW)).toBe(false);
  });

  it("fail when the signature is changed", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(await verifySessionToken(flipped, SECRET, NOW)).toBe(false);
  });

  it("fail for a missing, empty or malformed cookie, or a missing secret", async () => {
    const token = await createSessionToken(SECRET, NOW);
    for (const bad of [undefined, "", "garbage", ".", "123.", ".abc", "12e3.abc", "-5.abc"]) {
      expect(await verifySessionToken(bad, SECRET, NOW)).toBe(false);
    }
    expect(await verifySessionToken(token, undefined, NOW)).toBe(false);
    expect(await verifySessionToken(token, "", NOW)).toBe(false);
  });
});
