import { describe, expect, it } from "vitest";
import type { CycleRead } from "@/app/subscriptions/views";
import { cycleDays, cycleReadout, readCycleAt, readCycleDay } from "./cycleGeometry";

// Netflix in the design: Sep 23 to Oct 23, today Oct 20.
const netflix: CycleRead = {
  from: "2026-09-23",
  to: "2026-10-23",
  today: "2026-10-20",
  withYear: false,
  start: "paid ₹649",
  end: "renews ₹649 on the Millennia card",
  label: "Netflix's cycle, Sep 23 to Oct 23",
};
const days = cycleDays(netflix);
const say = (fraction: number, snap = 0.01) => {
  const { date, note } = cycleReadout(readCycleAt(fraction, days, snap), netflix);
  return `${date} · ${note}`;
};

describe("cycleDays", () => {
  it("counts the cycle's days and puts today in it", () => {
    expect(days).toEqual({ days: 30, today: 27 });
  });

  it("leaves today off a bar that starts later, as the cycle after a renewal paid ahead does", () => {
    expect(cycleDays({ from: "2026-10-23", to: "2026-11-23", today: "2026-10-21" })).toEqual({ days: 31, today: null });
  });
});

describe("readCycleAt", () => {
  it("reads the nearest day", () => {
    expect(readCycleAt(0.34, days, 0.01)).toEqual({ day: 10, at: 1 / 3, kind: "day" });
  });

  it("snaps to today and to the renewal, the nearer one winning", () => {
    expect(readCycleAt(0.885, days, 0.02)).toEqual({ day: 27, at: 0.9, kind: "today" });
    expect(readCycleAt(0.985, days, 0.02)).toEqual({ day: 30, at: 1, kind: "renewal" });
    // Both in reach: today is 0.03 away, the renewal 0.07.
    expect(readCycleAt(0.93, days, 0.1).kind).toBe("today");
    expect(readCycleAt(0.96, days, 0.1).kind).toBe("renewal");
  });

  it("calls a snap to today the start when today is the cycle's first day", () => {
    expect(readCycleAt(0.03, { days: 30, today: 0 }, 0.05)).toEqual({ day: 0, at: 0, kind: "start" });
  });

  it("keeps the reading on the bar, and never snaps to a today that isn't on it", () => {
    expect(readCycleAt(-0.4, days, 0.01)).toEqual({ day: 0, at: 0, kind: "start" });
    expect(readCycleAt(1.3, days, 0.01)).toEqual({ day: 30, at: 1, kind: "renewal" });
    expect(readCycleAt(0.05, { days: 31, today: null }, 0.1)).toMatchObject({ day: 2, kind: "day" });
  });
});

describe("readCycleDay", () => {
  it("steps day by day, as the arrow keys do, and lands exactly on today and the renewal", () => {
    expect(readCycleDay(26, days).kind).toBe("day");
    expect(readCycleDay(27, days).kind).toBe("today");
    expect(readCycleDay(31, days)).toEqual({ day: 30, at: 1, kind: "renewal" });
  });

  it("calls the first day the start even when it's today", () => {
    expect(readCycleDay(0, { days: 30, today: 0 }).kind).toBe("start");
  });
});

describe("cycleReadout", () => {
  it("says the date and how far it is from today", () => {
    expect(say(0.34)).toBe("Oct 3 · 17 days ago");
    expect(say(26 / 30)).toBe("Oct 19 · yesterday");
    expect(say(28 / 30)).toBe("Oct 21 · tomorrow");
  });

  it("says what each end and today are", () => {
    expect(say(0)).toBe("Sep 23 · paid ₹649");
    expect(say(0.9)).toBe("Today · 3 days to go");
    expect(say(1)).toBe("Oct 23 · renews ₹649 on the Millennia card");
    const dayBefore = { ...netflix, today: "2026-10-22" };
    expect(cycleReadout(readCycleDay(29, cycleDays(dayBefore)), dayBefore)).toEqual({ date: "Today", note: "1 day to go" });
  });

  it("says Today at the start on a renewal day, with what's due", () => {
    const due = { ...netflix, from: "2026-10-23", to: "2026-11-23", today: "2026-10-23", start: "renews ₹649 on the Millennia card" };
    expect(cycleReadout(readCycleDay(0, cycleDays(due)), due)).toEqual({ date: "Today", note: "renews ₹649 on the Millennia card" });
  });

  it("dates a cycle across two years with the year, and counts long gaps in months", () => {
    const yearly = { ...netflix, from: "2025-12-15", to: "2026-12-15", withYear: true, start: "paid ₹1,499", end: "renews ₹1,499" };
    const yearDays = cycleDays(yearly);
    expect(cycleReadout(readCycleDay(30, yearDays), yearly)).toEqual({ date: "Jan 14, 2026", note: "9 months ago" });
    expect(cycleReadout(readCycleDay(yearDays.days, yearDays), yearly)).toEqual({ date: "Dec 15, 2026", note: "renews ₹1,499" });
  });

  it("counts far-off days in months, as on a yearly cycle paid ahead", () => {
    const ahead = { ...netflix, from: "2026-10-23", to: "2027-10-23", today: "2026-10-21", withYear: true, start: "paid ₹1,499", end: "renews ₹1,499" };
    expect(cycleReadout(readCycleDay(200, cycleDays(ahead)), ahead)).toEqual({ date: "May 11, 2027", note: "in 7 months" });
    expect(cycleReadout(readCycleDay(0, cycleDays(ahead)), ahead)).toEqual({ date: "Oct 23, 2026", note: "paid ₹1,499" });
  });

  it("falls back to how far the start is when nothing is known about it", () => {
    expect(cycleReadout(readCycleDay(0, days), { ...netflix, start: "" })).toEqual({ date: "Sep 23", note: "27 days ago" });
  });
});
