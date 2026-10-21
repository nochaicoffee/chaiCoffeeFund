import { describe, expect, it } from "vitest";
import { formatDate, formatHeaderDate, formatMonthShort, formatMonthYear, formatShortDate, formatSpokenDate, greetingFor, todayIso } from "./date";

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

describe("greetingFor", () => {
  it("follows the clock in India, not UTC", () => {
    // 03:00 UTC is 08:30 in India.
    expect(greetingFor(new Date("2026-10-17T03:00:00Z"))).toBe("Good morning");
    expect(greetingFor(new Date("2026-10-17T06:29:00Z"))).toBe("Good morning"); // 11:59
    expect(greetingFor(new Date("2026-10-17T06:30:00Z"))).toBe("Good afternoon"); // 12:00
    expect(greetingFor(new Date("2026-10-17T11:29:00Z"))).toBe("Good afternoon"); // 16:59
    expect(greetingFor(new Date("2026-10-17T11:30:00Z"))).toBe("Good evening"); // 17:00
    expect(greetingFor(new Date("2026-10-17T18:00:00Z"))).toBe("Good evening"); // 23:30
  });
});

describe("month and date labels", () => {
  it("writes dates and months the way the design does", () => {
    expect(formatShortDate("2026-08-23")).toBe("Aug 23");
    expect(formatShortDate("2026-01-05")).toBe("Jan 5");
    expect(formatDate("2026-08-05")).toBe("Aug 5, 2026");
    expect(formatMonthYear("2026-07")).toBe("July 2026");
    expect(formatMonthShort("2026-12")).toBe("Dec");
  });
});

describe("formatSpokenDate", () => {
  it("writes the weekday, month and year out in full", () => {
    expect(formatSpokenDate("2026-10-18")).toBe("Sunday, October 18, 2026");
    expect(formatSpokenDate("2026-08-05")).toBe("Wednesday, August 5, 2026");
  });
});
