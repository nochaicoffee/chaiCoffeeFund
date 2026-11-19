import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, resolveOwnerName, resolveTimeZone } from "./appConfig";

describe("resolveTimeZone", () => {
  it("uses a real zone as it is written", () => {
    expect(resolveTimeZone("America/New_York")).toBe("America/New_York");
    expect(resolveTimeZone("  Europe/London ")).toBe("Europe/London");
  });
  it("falls back to India's when it's blank, missing or not a zone", () => {
    expect(resolveTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone("   ")).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone("Mars/Olympus_Mons")).toBe(DEFAULT_TIME_ZONE);
  });
});

describe("resolveOwnerName", () => {
  it("is empty when nothing is set, so the greeting has no name", () => {
    expect(resolveOwnerName(undefined)).toBe("");
    expect(resolveOwnerName("  ")).toBe("");
  });
  it("trims the name and keeps it to 40 characters", () => {
    expect(resolveOwnerName("  Asha ")).toBe("Asha");
    expect(resolveOwnerName("x".repeat(100))).toHaveLength(40);
  });
});
