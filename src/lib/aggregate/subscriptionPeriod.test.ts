import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "../demo/subscriptionsDemo";
import { lastMonths } from "./period";
import { chartWindows, GRID_MONTHS, inWindow, paidWindow, paymentsIn, TREND_MONTHS } from "./subscriptionPeriod";
import type { SpendPeriod } from "./cardSpend";

// The design's "today", so the demo data is the design's.
const TODAY = "2026-10-20";
const data = demoSubscriptionData(TODAY);
const year = (y: number): SpendPeriod => ({ kind: "year", year: y });
const range = (from: string, to: string): SpendPeriod => ({ kind: "range", from, to });

describe("paidWindow", () => {
  it("runs a year to this month, not to December: nothing after it has been paid", () => {
    expect(paidWindow(year(2026), TODAY, data.subscriptions, data.payments)).toEqual({ from: "2026-01", to: "2026-10" });
  });

  it("leaves a past year whole", () => {
    expect(paidWindow(year(2025), TODAY, data.subscriptions, data.payments)).toEqual({ from: "2025-01", to: "2025-12" });
  });

  it("is a range's own months, and the last N months ending with this one", () => {
    expect(paidWindow(range("2026-03", "2026-05"), TODAY, data.subscriptions, data.payments)).toEqual({ from: "2026-03", to: "2026-05" });
    expect(paidWindow(lastMonths(6, TODAY), TODAY, data.subscriptions, data.payments)).toEqual({ from: "2026-05", to: "2026-10" });
  });

  it("starts all time at the first payment, whatever the first subscription's start says", () => {
    const first = data.payments.filter((p) => p.status === "Paid" && p.amount > 0).map((p) => p.paymentDate.slice(0, 7)).sort()[0];
    expect(paidWindow({ kind: "all" }, TODAY, data.subscriptions, data.payments)).toEqual({ from: first, to: "2026-10" });
  });

  it("is empty before anything's been paid, for a period that hasn't started", () => {
    const w = paidWindow({ kind: "all" }, TODAY, [], []);
    expect(w.from <= w.to).toBe(true);
    expect(paidWindow(year(2030), TODAY, data.subscriptions, data.payments).from > "2026-10").toBe(true);
  });
});

describe("paymentsIn", () => {
  it("keeps the payments made in the window's months, the first and last included", () => {
    const march = paymentsIn(data.payments, { from: "2026-03", to: "2026-03" });
    expect(march.length).toBeGreaterThan(0);
    expect(march.every((p) => p.paymentDate.startsWith("2026-03"))).toBe(true);
    expect(inWindow("2026-03-31", { from: "2026-03", to: "2026-03" })).toBe(true);
    expect(inWindow("2026-04-01", { from: "2026-03", to: "2026-03" })).toBe(false);
  });
});

describe("chartWindows", () => {
  it("draws a year from January to December, so the renewals still to come show", () => {
    expect(chartWindows(year(2026), TODAY, data.subscriptions)).toEqual({ full: { from: "2026-01", to: "2026-12" }, days: { from: "2026-01", to: "2026-12" }, trend: { from: "2026-01", to: "2026-12" } });
  });

  it("draws a range's own months", () => {
    expect(chartWindows(range("2026-03", "2026-05"), TODAY, data.subscriptions).days).toEqual({ from: "2026-03", to: "2026-05" });
  });

  it("draws the latest 12 months of Day by day and 24 of the trend for a longer period", () => {
    const all = chartWindows({ kind: "all" }, TODAY, data.subscriptions);
    expect(all.full.from).toBe("2022-12");
    expect(all.days).toEqual({ from: "2026-01", to: "2026-12" });
    expect(all.trend).toEqual({ from: "2025-01", to: "2026-12" });
    expect(GRID_MONTHS).toBe(12);
    expect(TREND_MONTHS).toBe(24);
  });
});
