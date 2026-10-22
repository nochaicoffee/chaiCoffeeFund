import { describe, expect, it } from "vitest";
import { dayGrid, dayLevel, mondayOf, paidByYear, paymentTrend, phoneDayWindow, rangeTotals, renewalDays, runningTotal } from "./subscriptionChart";
import { allRenewals, lifetimeCost, yearSummary } from "./subscriptionRenewals";
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

  it("doesn't draw what's still to come of a subscription cancelled from a date ahead, as a month's spend doesn't count it", () => {
    // Cancelled with access to Dec 10: Oct 23 and Nov 23 are in the schedule, but cancelled adds nothing more.
    const cancelled = sub({ status: "Cancelled", endDate: "2026-12-10" });
    const payments = [pay("2026-07-23", 649), pay("2026-08-23", 649), pay("2026-09-23", 649)];
    expect(renewalDays([cancelled], payments, "2026-07-01", "2026-12-31", TODAY).map((d) => `${d.date} ${d.kind}`)).toEqual(["2026-07-23 paid", "2026-08-23 paid", "2026-09-23 paid"]);
    const grid = dayGrid([cancelled], payments, "2026-01", "2026-12", TODAY);
    for (const m of grid.months.slice(9)) expect(m).toMatchObject({ total: 0, renewals: 0, parts: {} });
    expect(rangeTotals(grid.days, "2026-10-01", "2026-12-31")).toMatchObject({ renewals: 0, toCome: 0, total: 0 });
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

  it("splits each month by subscription for its card, and counts its renewals and the ones not recorded", () => {
    const data = demoSubscriptionData("2026-10-20");
    const grid = dayGrid(data.subscriptions, data.payments, "2026-01", "2026-12", "2026-10-20");
    for (const m of grid.months) expect(Object.values(m.parts).reduce((t, v) => t + v, 0)).toBeCloseTo(m.total, 6);
    // September: five renewals make up its ₹3,485, and iCloud+'s Sep 24 wasn't recorded, so it's in the count but not the parts.
    const september = grid.months[8];
    expect(september).toMatchObject({ total: 3485, renewals: 6, notRecorded: 1 });
    expect(september.parts["demo-icloud"]).toBeUndefined();
    expect(grid.months.reduce((t, m) => t + m.notRecorded, 0)).toBe(1);
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

describe("rangeTotals", () => {
  const day = (date: string, ...renewals: [string, "paid" | "upcoming" | "missing" | "skipped" | "pending", number][]) => ({
    date,
    renewals: renewals.map(([subscriptionId, status, amount]) => ({ subscriptionId, status, amount })),
  });
  const days = [
    day("2026-09-08", ["chatgpt", "paid", 1999]),
    day("2026-09-23", ["netflix", "paid", 649], ["spotify", "skipped", 0]),
    day("2026-09-24", ["icloud", "missing", 219]),
    day("2026-10-01", ["news", "pending", 99]),
    day("2026-10-23", ["netflix", "upcoming", 649]),
    day("2026-11-08", ["chatgpt", "upcoming", 1999]),
  ];

  it("adds up the renewals between two days: paid, still to come, and not recorded, which isn't in the total", () => {
    expect(rangeTotals(days, "2026-09-01", "2026-12-31")).toEqual({ from: "2026-09-01", to: "2026-12-31", renewals: 7, paid: 2648, toCome: 2648, notRecorded: 1, total: 5296 });
  });

  it("works either way round, and counts the days at both ends", () => {
    expect(rangeTotals(days, "2026-10-23", "2026-09-23")).toEqual(rangeTotals(days, "2026-09-23", "2026-10-23"));
    expect(rangeTotals(days, "2026-10-23", "2026-09-23")).toMatchObject({ from: "2026-09-23", to: "2026-10-23", renewals: 5, paid: 649, toCome: 649, notRecorded: 1 });
    expect(rangeTotals(days, "2026-09-24", "2026-09-24")).toMatchObject({ renewals: 1, notRecorded: 1, total: 0 });
  });

  it("adds nothing for a renewal that didn't charge or is pending, and nothing for an empty range", () => {
    expect(rangeTotals(days, "2026-09-23", "2026-09-23")).toMatchObject({ renewals: 2, paid: 649, total: 649 });
    expect(rangeTotals(days, "2026-10-01", "2026-10-01")).toMatchObject({ renewals: 1, paid: 0, toCome: 0, total: 0 });
    expect(rangeTotals(days, "2026-10-02", "2026-10-22")).toEqual({ from: "2026-10-02", to: "2026-10-22", renewals: 0, paid: 0, toCome: 0, notRecorded: 0, total: 0 });
  });

  it("counts only the pick's renewals when given one", () => {
    expect(rangeTotals(days, "2026-09-01", "2026-12-31", "chatgpt")).toMatchObject({ renewals: 2, paid: 1999, toCome: 1999, notRecorded: 0, total: 3998 });
  });

  it("on the design's data, adds the rest of the year up to what's still due in it", () => {
    const data = demoSubscriptionData("2026-10-20");
    const grid = dayGrid(data.subscriptions, data.payments, "2026-01", "2026-12", "2026-10-20");
    const rest = rangeTotals(grid.days, "2026-10-20", "2026-12-31");
    const due = allRenewals(data.subscriptions, data.payments, "2026-10-20", "2026-12-31", "2026-10-20").filter((r) => r.status === "upcoming");
    expect(rest).toMatchObject({ paid: 0, notRecorded: 0, renewals: due.length, toCome: due.reduce((t, r) => t + r.amount, 0) });
    // Oct's last four, Nov and Dec, as the grid's totals have them.
    expect(rest.total).toBe(2186 + 3135 + 5183);
  });
});

describe("runningTotal", () => {
  const today = "2026-10-21";
  // Netflix monthly from Jul 23: Jul, Aug and Sep paid; Oct 23, Nov 23 and Dec 23 still to come.
  const paidJulToSep = [pay("2026-07-23", 649), pay("2026-08-23", 649), pay("2026-09-23", 649)];

  it("is what's been paid this year when nothing is left to renew before it ends", () => {
    const m365 = sub({ id: "m365", amount: 6199, billingCycle: "Yearly", billingAnchorDate: "2025-03-03", startDate: "2025-03-03" });
    const payments = [pay("2025-03-03", 5999, { subscriptionId: "m365" }), pay("2026-03-03", 6199, { subscriptionId: "m365" })];
    expect(runningTotal([m365], payments, today).yearTotal).toBe(6199);
    expect(runningTotal([m365], payments, today).yearTotal).toBe(yearSummary([m365], payments, today).paid);
  });

  it("adds the renewals still due before the year ends, at the plan's price", () => {
    expect(runningTotal([sub()], paidJulToSep, today).yearTotal).toBe(649 * 3 + 649 * 3);
  });

  it("doesn't count a renewal that passed without being recorded, and recording it adds exactly its payment", () => {
    // Sep 23 isn't recorded: Jul and Aug paid, plus Oct, Nov and Dec to come.
    const missingSep = paidJulToSep.filter((p) => p.paymentDate !== "2026-09-23");
    expect(runningTotal([sub()], missingSep, today).yearTotal).toBe(649 * 5);
    expect(runningTotal([sub()], [...missingSep, pay("2026-09-25", 649)], today).yearTotal).toBe(649 * 6);
  });

  it("adds nothing more for a paused or cancelled subscription than it's been paid", () => {
    expect(runningTotal([sub({ status: "Paused" })], paidJulToSep, today).yearTotal).toBe(649 * 3);
    expect(runningTotal([sub({ status: "Cancelled", endDate: "2026-10-10" })], paidJulToSep, today).yearTotal).toBe(649 * 3);
    // Cancelled from Dec 10: Oct 23 and Nov 23 are still in its schedule, and still add nothing.
    expect(runningTotal([sub({ status: "Cancelled", endDate: "2026-12-10" })], paidJulToSep, today).yearTotal).toBe(649 * 3);
  });

  it("counts what's still due at the plan's current price, after a price change", () => {
    const old = [pay("2026-07-23", 499), pay("2026-08-23", 499), pay("2026-09-23", 499)];
    expect(runningTotal([sub()], old, today).yearTotal).toBe(499 * 3 + 649 * 3);
  });

  it("counts a renewal marked paid ahead once, and one due today as still due", () => {
    const ahead = [...paidJulToSep, pay("2026-10-23", 649)];
    expect(runningTotal([sub()], ahead, today).yearTotal).toBe(runningTotal([sub()], paidJulToSep, today).yearTotal);
    expect(runningTotal([sub()], paidJulToSep, "2026-10-23").yearTotal).toBe(649 * 6);
  });

  it("adds up month by month from January to the year figure", () => {
    const data = demoSubscriptionData("2026-10-20");
    const all = runningTotal(data.subscriptions, data.payments, "2026-10-20");
    expect(all.year).toBe("2026");
    expect(all.months.map((m) => m.month)).toEqual(Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`));
    expect(all.months[0].cumulative).toBe(all.months[0].total);
    expect(all.months.filter((m) => m.expected > 0).map((m) => m.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
    for (let i = 1; i < 12; i++) expect(all.months[i].cumulative).toBeCloseTo(all.months[i - 1].cumulative + all.months[i].total, 6);
    expect(all.months.at(-1)!.cumulative).toBe(all.yearTotal);
    // Paid so far this year (the greeting's ₹57,163) plus Oct's last four renewals, Nov and Dec.
    expect(yearSummary(data.subscriptions, data.payments, "2026-10-20").paid).toBe(57163);
    expect(all.yearTotal).toBe(57163 + 2186 + 3135 + 5183);
  });

  it("follows the pick: each subscription's own, which add up to All's", () => {
    const data = demoSubscriptionData("2026-10-20");
    const each = data.subscriptions.map((s) => runningTotal(data.subscriptions, data.payments, "2026-10-20", s.id).yearTotal);
    expect(each.reduce((t, v) => t + v, 0)).toBeCloseTo(runningTotal(data.subscriptions, data.payments, "2026-10-20").yearTotal, 6);
    expect(runningTotal(data.subscriptions, data.payments, "2026-10-20", "demo-cult").yearTotal).toBe(4500 * 4);
  });
});

describe("paidByYear", () => {
  it("adds up each calendar year's charged payments by the day they were made, with ₹0 for a year with none", () => {
    const payments = [
      pay("2024-12-23", 499),
      pay("2026-01-02", 499),
      pay("2026-02-23", 0, { status: "Skipped" }),
      pay("2026-03-23", 649, { status: "Pending" }),
      pay("2026-07-23", 649),
      pay("2026-07-23", 119, { subscriptionId: "spotify" }),
    ];
    expect(paidByYear(payments, "netflix")).toEqual([
      { year: "2024", paid: 499 },
      { year: "2025", paid: 0 },
      { year: "2026", paid: 1148 },
    ]);
    expect(paidByYear(payments, "nothing")).toEqual([]);
  });

  it("adds up to each subscription's lifetime cost", () => {
    const data = demoSubscriptionData("2026-10-20");
    for (const c of lifetimeCost(data.subscriptions, data.payments)) {
      expect(paidByYear(data.payments, c.subscriptionId).reduce((t, y) => t + y.paid, 0)).toBeCloseTo(c.paid, 6);
    }
    // Prime, yearly since Dec 2022: one payment a year.
    expect(paidByYear(data.payments, "demo-prime").map((y) => y.year)).toEqual(["2022", "2023", "2024", "2025"]);
  });
});
