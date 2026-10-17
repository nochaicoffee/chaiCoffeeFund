import { describe, expect, it } from "vitest";
import { formatHeaderDate, todayIso } from "./date";

describe("todayIso", () => {
  it("uses the given time zone, not UTC", () => {
    // 2026-10-16 20:00 UTC is already 2026-10-17 01:30 in India.
    const lateUtc = new Date("2026-10-16T20:00:00Z");
    expect(todayIso(lateUtc, "Asia/Kolkata")).toBe("2026-10-17");
    expect(todayIso(lateUtc, "UTC")).toBe("2026-10-16");
  });

  it("pads month and day", () => {
    expect(todayIso(new Date("2026-03-05T06:00:00Z"), "Asia/Kolkata")).toBe("2026-03-05");
  });
});

describe("formatHeaderDate", () => {
  it("shows weekday, day and short month in the given time zone", () => {
    expect(formatHeaderDate(new Date("2026-10-16T20:00:00Z"), "Asia/Kolkata")).toBe("Sat, 17 Oct");
  });
});

describe("defaults", () => {
  it("uses the app's time zone when none is given", () => {
    const lateUtc = new Date("2026-10-16T20:00:00Z");
    expect(todayIso(lateUtc)).toBe("2026-10-17");
    expect(formatHeaderDate(lateUtc)).toBe("Sat, 17 Oct");
  });
});
