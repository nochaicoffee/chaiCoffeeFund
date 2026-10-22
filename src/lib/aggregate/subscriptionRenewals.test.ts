import { describe, expect, it } from "vitest";
import {
  allRenewals,
  chargedOffPlan,
  cycleProgress,
  firstRenewalAfter,
  lifetimeCost,
  matchWindowDays,
  monthEnd,
  monthlySpendSeries,
  paidByMonth,
  priceChanges,
  renewalAction,
  renewalsByDay,
  renewalsFor,
  scheduleDates,
  yearSummary,
  type Renewal,
} from "./subscriptionRenewals";
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

let nextId = 0;
const pay = (paymentDate: string, amount: number, overrides: Partial<SubscriptionPayment> = {}): SubscriptionPayment => ({
  id: `pay-${++nextId}`,
  subscriptionId: "netflix",
  paymentDate,
  amount,
  status: "Paid",
  ...overrides,
});

const statuses = (renewals: Renewal[]) => renewals.map((r) => `${r.date} ${r.status}`);

describe("scheduleDates", () => {
  it("steps a monthly schedule from its anchor", () => {
    expect(scheduleDates(sub({ billingAnchorDate: "2024-02-23", startDate: "2024-02-23" }), "2026-09-01", "2026-11-30")).toEqual(["2026-09-23", "2026-10-23", "2026-11-23"]);
  });

  it("comes back to the 31st after a short month", () => {
    expect(scheduleDates(sub({ billingAnchorDate: "2026-01-31", startDate: "2026-01-31" }), "2026-01-01", "2026-05-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("steps back from an anchor after the range", () => {
    expect(scheduleDates(sub({ billingAnchorDate: "2026-12-15", startDate: "2026-01-15" }), "2026-08-01", "2026-10-31")).toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);
  });

  it("never goes before the start date", () => {
    expect(scheduleDates(sub({ billingAnchorDate: "2026-01-10", startDate: "2026-06-10" }), "2026-01-01", "2026-08-31")).toEqual(["2026-06-10", "2026-07-10", "2026-08-10"]);
  });

  it("steps quarterly and yearly schedules by whole cycles", () => {
    expect(scheduleDates(sub({ billingCycle: "Quarterly", billingAnchorDate: "2026-01-05", startDate: "2026-01-05" }), "2026-01-01", "2026-12-31")).toEqual([
      "2026-01-05",
      "2026-04-05",
      "2026-07-05",
      "2026-10-05",
    ]);
    expect(scheduleDates(sub({ billingCycle: "Yearly", billingAnchorDate: "2024-02-29", startDate: "2024-02-29" }), "2024-01-01", "2028-12-31")).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
  });

  it("is empty when the range ends before the start date", () => {
    expect(scheduleDates(sub({ startDate: "2027-01-01" }), "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("matchWindowDays", () => {
  it("is half a cycle: about 15, 46 and 183 days", () => {
    expect(matchWindowDays({ billingCycle: "Monthly" })).toBeCloseTo(15.2, 1);
    expect(matchWindowDays({ billingCycle: "Quarterly" })).toBeCloseTo(45.7, 1);
    expect(matchWindowDays({ billingCycle: "Yearly" })).toBeCloseTo(182.6, 1);
  });
});

describe("renewalsFor", () => {
  it("marks each renewal paid, not recorded or upcoming", () => {
    const payments = [pay("2026-07-23", 649), pay("2026-08-25", 649)];
    expect(statuses(renewalsFor(sub(), payments, "2026-07-01", "2026-11-30", TODAY))).toEqual([
      "2026-07-23 paid",
      "2026-08-23 paid",
      "2026-09-23 missing",
      "2026-10-23 upcoming",
      "2026-11-23 upcoming",
    ]);
  });

  it("counts a late or early payment within half a cycle for its renewal", () => {
    const late = renewalsFor(sub(), [pay("2026-09-07", 649)], "2026-08-01", "2026-08-31", TODAY);
    expect(late[0]).toMatchObject({ date: "2026-08-23", status: "paid", amount: 649 });
    const early = renewalsFor(sub(), [pay("2026-10-20", 649)], "2026-10-01", "2026-10-31", TODAY);
    expect(early[0]).toMatchObject({ date: "2026-10-23", status: "paid" });
  });

  it("gives a quarterly renewal 45 days either side", () => {
    const quarterly = sub({ billingCycle: "Quarterly", billingAnchorDate: "2026-01-05", startDate: "2026-01-05" });
    const renewals = renewalsFor(quarterly, [pay("2026-02-14", 649)], "2026-01-01", "2026-06-30", TODAY);
    expect(statuses(renewals)).toEqual(["2026-01-05 paid", "2026-04-05 missing"]);
  });

  it("settles one renewal per payment: a second charge in a cycle doesn't settle the next one", () => {
    const payments = [pay("2026-08-23", 649), pay("2026-08-30", 649)];
    expect(statuses(renewalsFor(sub(), payments, "2026-08-01", "2026-09-30", TODAY))).toEqual(["2026-08-23 paid", "2026-09-23 missing"]);
  });

  it("shows a ₹0 Skipped payment as skipped, not as not recorded", () => {
    const renewals = renewalsFor(sub(), [pay("2026-09-23", 0, { status: "Skipped" })], "2026-09-01", "2026-09-30", TODAY);
    expect(renewals[0]).toMatchObject({ status: "skipped", amount: 0 });
  });

  it("shows a Pending payment as pending", () => {
    expect(renewalsFor(sub(), [pay("2026-09-23", 649, { status: "Pending" })], "2026-09-01", "2026-09-30", TODAY)[0].status).toBe("pending");
  });

  it("ignores other subscriptions' payments", () => {
    const renewals = renewalsFor(sub(), [pay("2026-09-23", 649, { subscriptionId: "spotify" })], "2026-09-01", "2026-09-30", TODAY);
    expect(renewals[0].status).toBe("missing");
  });

  it("stops a paused subscription after its last payment", () => {
    const payments = [pay("2026-07-23", 649), pay("2026-08-23", 649)];
    expect(statuses(renewalsFor(sub({ status: "Paused" }), payments, "2026-07-01", "2026-12-31", TODAY))).toEqual(["2026-07-23 paid", "2026-08-23 paid"]);
    expect(renewalsFor(sub({ status: "Paused" }), [], "2026-07-01", "2026-12-31", TODAY)).toEqual([]);
  });

  it("stops a cancelled subscription at its cancelled-on date, then shows the next renewal as won't renew", () => {
    const cancelled = sub({ status: "Cancelled", endDate: "2026-09-14" });
    const payments = [pay("2026-07-23", 649), pay("2026-08-23", 649)];
    expect(statuses(renewalsFor(cancelled, payments, "2026-07-01", "2026-12-31", TODAY))).toEqual(["2026-07-23 paid", "2026-08-23 paid", "2026-09-23 wont-renew"]);
  });

  it("doesn't mark a later renewal as won't renew when the range starts after the cancellation", () => {
    const cancelled = sub({ status: "Cancelled", endDate: "2026-09-14" });
    expect(renewalsFor(cancelled, [pay("2026-08-23", 649)], "2026-10-01", "2026-12-31", TODAY)).toEqual([]);
  });

  it("treats a renewal on the cancelled-on date as one that won't happen, unless it was paid", () => {
    const cancelled = sub({ status: "Cancelled", endDate: "2026-10-23" });
    expect(statuses(renewalsFor(cancelled, [pay("2026-09-23", 649)], "2026-09-01", "2026-12-31", "2026-10-28"))).toEqual(["2026-09-23 paid", "2026-10-23 wont-renew"]);
    const paidLast = [pay("2026-09-23", 649), pay("2026-10-23", 649)];
    expect(statuses(renewalsFor(cancelled, paidLast, "2026-09-01", "2026-12-31", "2026-10-28"))).toEqual(["2026-09-23 paid", "2026-10-23 paid", "2026-11-23 wont-renew"]);
  });

  it("doesn't expect the renewals missed while it was stopped, once it's resumed", () => {
    // Paused after Jul 23's payment, resumed Oct 1: Aug 23 and Sep 23 weren't due; Oct 23 is.
    const resumed = sub({ resumedOn: "2026-10-01" });
    const payments = [pay("2026-07-23", 649)];
    expect(statuses(renewalsFor(resumed, payments, "2026-07-01", "2026-11-30", "2026-10-28"))).toEqual(["2026-07-23 paid", "2026-10-23 missing", "2026-11-23 upcoming"]);
  });

  it("expects a renewal on the resume date itself, and still shows the one paid just before it stopped", () => {
    const resumed = sub({ resumedOn: "2026-09-23" });
    const payments = [pay("2026-07-23", 649), pay("2026-08-25", 649)];
    // Aug 23 was paid after all, so it shows; Sep 23 is the day it started again, so it's due.
    expect(statuses(renewalsFor(resumed, payments, "2026-07-01", "2026-09-30", "2026-10-28"))).toEqual(["2026-07-23 paid", "2026-08-23 paid", "2026-09-23 missing"]);
  });

  it("restarts a cancelled one from its resume date, with nothing before it flagged", () => {
    const restarted = sub({ status: "Active", resumedOn: "2026-10-15" });
    expect(statuses(renewalsFor(restarted, [], "2026-07-01", "2026-10-31", "2026-10-28"))).toEqual(["2026-10-23 missing"]);
  });

  it("stops a cancelled subscription with no cancelled-on date after its last payment", () => {
    const payments = [pay("2026-07-23", 649)];
    expect(statuses(renewalsFor(sub({ status: "Cancelled" }), payments, "2026-07-01", "2026-12-31", TODAY))).toEqual(["2026-07-23 paid"]);
  });

  it("settles the same renewal whatever range is asked for", () => {
    // Oct 8 is 15 days from both Sep 23 and Oct 23: it settles the earlier one, in either range.
    const payments = [pay("2026-10-08", 649)];
    expect(statuses(renewalsFor(sub(), payments, "2026-09-01", "2026-10-31", TODAY))).toEqual(["2026-09-23 paid", "2026-10-23 upcoming"]);
    expect(statuses(renewalsFor(sub(), payments, "2026-10-01", "2026-10-31", TODAY))).toEqual(["2026-10-23 upcoming"]);
  });

  it("settles renewals in date order, so a late payment isn't taken by the next renewal", () => {
    // Mar 10 is 15 days late for Feb 23 and 13 days early for Mar 23, which has its own payment.
    const feb = sub({ billingAnchorDate: "2026-01-23", startDate: "2026-01-23" });
    const payments = [pay("2026-03-10", 649), pay("2026-03-23", 649)];
    expect(statuses(renewalsFor(feb, payments, "2026-02-01", "2026-03-31", TODAY))).toEqual(["2026-02-23 paid", "2026-03-23 paid"]);
  });

  it("matches a payment just outside the range to its renewal inside it", () => {
    const renewals = renewalsFor(sub(), [pay("2026-08-29", 649)], "2026-08-01", "2026-08-25", TODAY);
    expect(renewals[0]).toMatchObject({ date: "2026-08-23", status: "paid" });
  });
});

describe("allRenewals", () => {
  it("lists every subscription's renewals by date", () => {
    const spotify = sub({ id: "spotify", amount: 119, billingAnchorDate: "2026-09-02", startDate: "2026-09-02" });
    const renewals = allRenewals([sub(), spotify], [], "2026-09-01", "2026-10-31", TODAY);
    expect(renewals.map((r) => `${r.date} ${r.subscriptionId}`)).toEqual(["2026-09-02 spotify", "2026-09-23 netflix", "2026-10-02 spotify", "2026-10-23 netflix"]);
  });
});

describe("firstRenewalAfter and monthEnd", () => {
  it("finds the first renewal after a date", () => {
    expect(firstRenewalAfter(sub(), "2026-09-14")).toBe("2026-09-23");
    expect(firstRenewalAfter(sub(), "2026-09-23")).toBe("2026-10-23");
    expect(firstRenewalAfter(sub({ billingCycle: "Yearly" }), "2026-07-23")).toBe("2027-07-23");
  });

  it("gives a month's last day", () => {
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2024-02")).toBe("2024-02-29");
    expect(monthEnd("2026-12")).toBe("2026-12-31");
  });
});

describe("paidByMonth", () => {
  it("adds charged payments by month, leaving out Skipped and Pending ones", () => {
    const payments = [pay("2026-08-23", 649), pay("2026-08-30", 99), pay("2026-09-23", 0, { status: "Skipped" }), pay("2026-10-20", 649, { status: "Pending" })];
    expect(Object.fromEntries(paidByMonth(payments))).toEqual({ "2026-08": 748 });
  });
});

describe("monthlySpendSeries", () => {
  const netflix = sub();
  const icloud = sub({ id: "icloud", amount: 1499, billingCycle: "Yearly", billingAnchorDate: "2025-12-05", startDate: "2025-12-05" });
  const payments = [pay("2026-07-23", 649), pay("2026-08-25", 649), pay("2026-10-20", 649), pay("2025-12-05", 1499, { subscriptionId: "icloud" })];

  it("is what was paid for past months, paid plus still to come for this month, and expected for future months", () => {
    expect(monthlySpendSeries([netflix, icloud], payments, "2026-07", "2026-12", TODAY)).toEqual([
      { month: "2026-07", paid: 649, expected: 0, total: 649 },
      { month: "2026-08", paid: 649, expected: 0, total: 649 },
      // September's renewal wasn't recorded: it's flagged, not counted.
      { month: "2026-09", paid: 0, expected: 0, total: 0 },
      // October's was paid early, so nothing is still to come.
      { month: "2026-10", paid: 649, expected: 0, total: 649 },
      { month: "2026-11", paid: 0, expected: 649, total: 649 },
      { month: "2026-12", paid: 0, expected: 649 + 1499, total: 2148 },
    ]);
  });

  it("counts a renewal marked paid ahead in its own month, as paid and not also expected", () => {
    // On Oct 30, Mark paid for the Nov 2 renewal records ₹649 on Nov 2.
    const early = sub({ billingAnchorDate: "2026-09-02", startDate: "2026-09-02" });
    const series = monthlySpendSeries([early], [pay("2026-11-02", 649)], "2026-11", "2026-12", "2026-10-30");
    expect(series).toEqual([
      { month: "2026-11", paid: 649, expected: 0, total: 649 },
      { month: "2026-12", paid: 0, expected: 649, total: 649 },
    ]);
  });

  it("counts this month's renewals still to come at the plan's price", () => {
    const series = monthlySpendSeries([netflix], [pay("2026-10-02", 99)], "2026-10", "2026-10", TODAY);
    expect(series[0]).toEqual({ month: "2026-10", paid: 99, expected: 649, total: 748 });
  });

  it("expects nothing from paused or cancelled subscriptions", () => {
    const series = monthlySpendSeries([sub({ status: "Paused" }), sub({ id: "x", status: "Cancelled" })], [], "2026-11", "2026-12", TODAY);
    expect(series.every((m) => m.total === 0)).toBe(true);
  });

  it("narrows to one subscription", () => {
    const series = monthlySpendSeries([netflix, icloud], payments, "2026-12", "2026-12", TODAY, "icloud");
    expect(series[0]).toEqual({ month: "2026-12", paid: 0, expected: 1499, total: 1499 });
  });
});

describe("renewalsByDay", () => {
  it("groups renewals by date", () => {
    const spotify = sub({ id: "spotify", billingAnchorDate: "2026-09-23", startDate: "2026-09-23" });
    const days = renewalsByDay(allRenewals([sub(), spotify], [], "2026-09-01", "2026-09-30", TODAY));
    expect([...days.keys()]).toEqual(["2026-09-23"]);
    expect(days.get("2026-09-23")?.map((r) => r.subscriptionId)).toEqual(["netflix", "spotify"]);
  });
});

describe("lifetimeCost", () => {
  it("adds every charged payment per subscription, biggest first", () => {
    const icloud = sub({ id: "icloud" });
    const payments = [pay("2026-07-23", 649), pay("2026-08-23", 649), pay("2026-09-23", 0, { status: "Skipped" }), pay("2025-12-05", 1499, { subscriptionId: "icloud" })];
    expect(lifetimeCost([sub(), icloud], payments)).toEqual([
      { subscriptionId: "icloud", paid: 1499, payments: 1, amounts: [1499] },
      { subscriptionId: "netflix", paid: 1298, payments: 2, amounts: [649, 649] },
    ]);
  });

  it("is ₹0 with no payments", () => {
    expect(lifetimeCost([sub()], [])).toEqual([{ subscriptionId: "netflix", paid: 0, payments: 0, amounts: [] }]);
  });
});

describe("priceChanges", () => {
  it("counts a payment 2% or more different from the one before it, and ignores smaller moves", () => {
    // 649 → 659 is 1.5% (ignored, such as a dollar-billed charge's exchange rate); 659 → 799 is 21%.
    const payments = [pay("2026-06-23", 649), pay("2026-07-23", 649), pay("2026-08-23", 659), pay("2026-09-23", 799)];
    expect(priceChanges(payments, "netflix")).toEqual([{ subscriptionId: "netflix", date: "2026-09-23", from: 659, to: 799 }]);
  });

  it("counts exactly 2%, and a price drop", () => {
    expect(priceChanges([pay("2026-07-23", 1000), pay("2026-08-23", 1020), pay("2026-09-23", 500)], "netflix").map((c) => c.to)).toEqual([1020, 500]);
  });

  it("skips ₹0 Skipped payments rather than counting a drop to ₹0", () => {
    expect(priceChanges([pay("2026-07-23", 649), pay("2026-08-23", 0, { status: "Skipped" }), pay("2026-09-23", 649)], "netflix")).toEqual([]);
  });
});

describe("chargedOffPlan", () => {
  it("returns the latest charge when it's 2% or more off the plan's price", () => {
    const latest = pay("2026-09-23", 799);
    expect(chargedOffPlan(sub(), [pay("2026-08-23", 649), latest])).toBe(latest);
  });

  it("is null within 2%, with no payments, or when not active", () => {
    expect(chargedOffPlan(sub(), [pay("2026-09-23", 655)])).toBeNull();
    expect(chargedOffPlan(sub(), [])).toBeNull();
    expect(chargedOffPlan(sub({ status: "Paused" }), [pay("2026-09-23", 799)])).toBeNull();
  });
});

describe("renewalAction", () => {
  const renewal = (date: string, status: Renewal["status"]): Renewal => ({ subscriptionId: "netflix", date, status, amount: 649 });

  it("offers Mark paid from 3 days before a renewal, today included", () => {
    expect(renewalAction(renewal("2026-10-24", "upcoming"), TODAY)).toBe("mark-paid");
    expect(renewalAction(renewal("2026-10-21", "upcoming"), TODAY)).toBe("mark-paid");
    expect(renewalAction(renewal("2026-10-25", "upcoming"), TODAY)).toBeNull();
  });

  it("offers Record payment once a renewal has passed with none, and the menu once it's recorded", () => {
    expect(renewalAction(renewal("2026-09-23", "missing"), TODAY)).toBe("record-payment");
    expect(renewalAction(renewal("2026-09-23", "paid"), TODAY)).toBe("payment-menu");
    expect(renewalAction(renewal("2026-09-23", "skipped"), TODAY)).toBe("payment-menu");
    expect(renewalAction(renewal("2026-11-23", "wont-renew"), TODAY)).toBeNull();
  });
});

describe("cycleProgress", () => {
  it("places today between the last renewal and the next", () => {
    expect(cycleProgress(sub(), TODAY)).toEqual({ last: "2026-09-23", next: "2026-10-23", fraction: 28 / 30 });
  });

  it("starts a new cycle on the renewal date", () => {
    expect(cycleProgress(sub(), "2026-10-23")).toEqual({ last: "2026-10-23", next: "2026-11-23", fraction: 0 });
  });

  it("is null for a paused subscription, or before the first renewal", () => {
    expect(cycleProgress(sub({ status: "Paused" }), TODAY)).toBeNull();
    expect(cycleProgress(sub({ billingAnchorDate: "2026-11-01", startDate: "2026-11-01" }), TODAY)).toBeNull();
  });

  it("works for a yearly plan", () => {
    const yearly = sub({ billingCycle: "Yearly", billingAnchorDate: "2025-12-05", startDate: "2025-12-05" });
    expect(cycleProgress(yearly, TODAY)).toMatchObject({ last: "2025-12-05", next: "2026-12-05" });
  });
});

describe("yearSummary", () => {
  const payments = [pay("2025-12-23", 649), pay("2026-07-23", 649), pay("2026-08-23", 799), pay("2026-09-23", 649)];

  it("adds this year's payments, averages them over every month so far, and finds the biggest month", () => {
    const summary = yearSummary([sub()], payments, TODAY);
    expect(summary.paid).toBe(649 + 799 + 649);
    expect(summary.monthlyAverage).toBeCloseTo((649 + 799 + 649) / 10, 6);
    expect(summary.biggestMonth).toEqual({ month: "2026-08", paid: 799 });
  });

  it("counts the renewals still to come in the next 30 days", () => {
    // Oct 23 is due; Nov 23 is more than 30 days off.
    expect(yearSummary([sub()], payments, TODAY).next30).toEqual({ count: 1, total: 649 });
  });

  it("still counts a renewal in the next 30 days that was marked paid ahead", () => {
    const early = sub({ billingAnchorDate: "2026-09-02", startDate: "2026-09-02" });
    expect(yearSummary([early], [pay("2026-11-02", 649)], "2026-10-30").next30).toEqual({ count: 1, total: 649 });
  });

  it("lists what was paid in each month so far this year, adding up to the year, and the renewals it counts", () => {
    const summary = yearSummary([sub()], payments, TODAY);
    expect(summary.months).toHaveLength(10);
    expect(summary.months[0]).toEqual({ month: "2026-01", paid: 0 });
    expect(summary.months.find((m) => m.month === "2026-08")).toEqual({ month: "2026-08", paid: 799 });
    expect(summary.months.reduce((t, m) => t + m.paid, 0)).toBe(summary.paid);
    expect(summary.soon.map((r) => r.date)).toEqual(["2026-10-23"]);
  });

  it("has no biggest month before any payment this year", () => {
    expect(yearSummary([sub()], [], TODAY)).toMatchObject({ paid: 0, monthlyAverage: 0, biggestMonth: null });
  });
});
