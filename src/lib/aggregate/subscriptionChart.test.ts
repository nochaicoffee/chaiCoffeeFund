import { describe, expect, it } from "vitest";
import { dayGrid, dayLevel, mondayOf, paymentTrend, phoneDayWindow, renewalDays } from "./subscriptionChart";
import { demoSubscriptionData } from "../demo/subscriptionsDemo";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

const TODAY = "2026-10-21";
const sub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "netflix",
  name: "Netflix Premium",
  alias: "Netflix",
  category: "Streaming",
  amount: 649,
  billingCycle: "Monthly",
  billingAnchorDate: "2026-07-23",
  startDate: "2026-07-23",
  status: "Active",
  ...overrides,
});
let n = 0;
const pay = (paymentDate: string, amount: number, overrides: Partial<SubscriptionPayment> = {}): SubscriptionPayment => ({ id: `p${++n}`, subscriptionId: "netflix", paymentDate, amount, status: "Paid", ...overrides });

describe("dayLevel", () => {
  it("shades a day by what it cost: under ₹200, under ₹800, under ₹2,000, more", () => {
    expect([0, 199, 200, 799, 800, 1999, 2000, 6199].map(dayLevel)).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe("renewalDays", () => {
  it("marks each day paid, not recorded or still to come, and adds up what it cost", () => {
    const spotify = sub({ id: "spotify", amount: 119, billingAnchorDate: "2026-08-23", startDate: "2026-08-23" });
    const payments = [pay("2026-07-23", 649), pay("2026-08-23", 649), pay("2026-08-23", 119, { subscriptionId: "spotify" })];
    const days = renewalDays([sub(), spotify], payments, "2026-07-01", "2026-10-31", TODAY);
    expect(days.map((d) => `${d.date} ${d.kind} ${d.total} L${d.level}`)).toEqual(["2026-07-23 paid 649 L3", "2026-08-23 paid 768 L3", "2026-09-23 missing 768 L3", "2026-10-23 expected 768 L3"]);
  });

  it("draws a day with a pending payment as pending, not paid", () => {
    const days = renewalDays([sub()], [pay("2026-08-23", 649, { status: "Pending" })], "2026-08-01", "2026-08-31", TODAY);
    expect(days[0]).toMatchObject({ date: "2026-08-23", kind: "pending" });
  });

  it("leaves out a renewal that won't happen, and shows a skipped one as skipped", () => {
    const cancelled = sub({ status: "Cancelled", endDate: "2026-09-14" });
    const days = renewalDays([cancelled], [pay("2026-07-23", 649), pay("2026-08-23", 0, { status: "Skipped" })], "2026-07-01", "2026-12-31", TODAY);
    expect(days.map((d) => `${d.date} ${d.kind}`)).toEqual(["2026-07-23 paid", "2026-08-23 skipped"]);
  });
});

describe("dayGrid", () => {
  it("lays the year out in weeks from the Monday before Jan 1, with each month where its first day falls", () => {
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
    const grid = dayGrid([sub()], [], "2026-01", "2026-12", TODAY);
    expect(grid).toMatchObject({ start: "2025-12-29", first: "2026-01-01", last: "2026-12-31", weeks: 53 });
    // Feb 1, 2026 is a Sunday, so February starts in the week January ends in, as the design draws it.
    expect(grid.months[0]).toMatchObject({ month: "2026-01", week: 0, weeks: 4 });
    expect(grid.months[1]).toMatchObject({ month: "2026-02", week: 4 });
    expect(grid.months.reduce((t, m) => t + m.weeks, 0)).toBe(53);
    expect(grid.months.find((m) => m.month === "2026-11")).toMatchObject({ future: true, total: 649 });
  });

  it("gives each month the spend the trend gives it", () => {
    const data = demoSubscriptionData("2026-10-20");
    const grid = dayGrid(data.subscriptions, data.payments, "2026-01", "2026-12", "2026-10-20");
    const trend = paymentTrend(data.subscriptions, data.payments, "2026-10-20");
    for (const m of grid.months) {
      const t = trend.months.find((x) => x.month === m.month);
      if (t) expect(m.total).toBe(t.total);
    }
    // The design's March, its biggest month.
    expect(grid.months[2].total).toBe(10032);
  });
});

describe("phoneDayWindow", () => {
  it("fits five months, from two before this one, inside the year", () => {
    expect(phoneDayWindow("2026-10-21")).toEqual({ from: "2026-08", to: "2026-12" });
    expect(phoneDayWindow("2026-02-10")).toEqual({ from: "2026-01", to: "2026-05" });
    expect(phoneDayWindow("2026-12-31")).toEqual({ from: "2026-08", to: "2026-12" });
  });
});

describe("paymentTrend", () => {
  const data = demoSubscriptionData("2026-10-20");
  const trend = paymentTrend(data.subscriptions, data.payments, "2026-10-20");

  it("covers the last 12 months paid and the next 6 expected", () => {
    expect(trend.months.map((m) => m.month)).toEqual([
      "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
      "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04",
    ]);
    expect(trend.months.filter((m) => m.future)).toHaveLength(6);
    expect(trend.peak).toBe("2026-03");
  });

  it("splits each month by subscription, the parts adding up to the month", () => {
    for (const m of trend.months) expect(Object.values(m.parts).reduce((t, v) => t + v, 0)).toBeCloseTo(m.total, 6);
    const march = trend.months.find((m) => m.month === "2026-03")!;
    expect(march.parts["demo-m365"]).toBe(6199);
    expect(march.renewals[0]).toMatchObject({ subscriptionId: "demo-m365", amount: 6199 });
  });

  it("has no peak with nothing paid or due so far", () => {
    expect(paymentTrend([], [], TODAY).peak).toBeNull();
    // Nothing paid yet, but this month's renewal still to come makes it the biggest so far.
    expect(paymentTrend([sub()], [], TODAY).peak).toBe("2026-10");
  });
});
