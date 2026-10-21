import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { parseRenewalsState, renewalsPeriodMenu, renewalsQuery, renewalsRangeStart } from "./params";

const TODAY = "2026-10-20";
const data = demoSubscriptionData(TODAY);

describe("parseRenewalsState", () => {
  it("defaults to every renewal this year, newest first", () => {
    expect(parseRenewalsState({}, data, TODAY, false)).toEqual({
      period: { kind: "year", year: 2026 },
      status: "all",
      subscriptionId: undefined,
      place: undefined,
      search: undefined,
      sort: "newest",
      page: 1,
      showLater: false,
      demo: false,
    });
  });

  it("reads each choice, and ignores a subscription, card or account that doesn't exist", () => {
    const state = parseRenewalsState({ status: "not-recorded", sub: "demo-netflix", card: "demo-ace", q: " 649 ", sort: "oldest", page: "2", later: "1", period: "all" }, data, TODAY, true);
    expect(state).toMatchObject({ status: "not-recorded", subscriptionId: "demo-netflix", place: { kind: "card", id: "demo-ace" }, search: "649", sort: "oldest", page: 2, showLater: true, period: { kind: "all" } });
    expect(parseRenewalsState({ status: "missing", sub: "gone", card: "gone" }, data, TODAY, false)).toMatchObject({ status: "all", subscriptionId: undefined, place: undefined });
    expect(parseRenewalsState({ account: "demo-kotak" }, data, TODAY, false).place).toEqual({ kind: "account", id: "demo-kotak" });
  });
});

describe("renewalsQuery", () => {
  it("leaves out the defaults and keeps sample data as a bare demo", () => {
    const state = parseRenewalsState({}, data, TODAY, false);
    expect(renewalsQuery(state, TODAY)).toBe("?");
    expect(renewalsQuery({ ...state, subscriptionId: "demo-netflix", period: { kind: "all" }, demo: true }, TODAY)).toBe("?sub=demo-netflix&period=all&demo");
    expect(renewalsQuery({ ...state, status: "paid", place: { kind: "account", id: "demo-kotak" }, page: 3, showLater: true }, TODAY)).toBe("?status=paid&account=demo-kotak&page=3&later=1");
  });

  it("reads back what it writes", () => {
    const state = { ...parseRenewalsState({}, data, TODAY, true), status: "upcoming" as const, subscriptionId: "demo-icloud", place: { kind: "card" as const, id: "demo-ace" }, search: "icloud", sort: "oldest" as const };
    const params = Object.fromEntries(new URLSearchParams(renewalsQuery(state, TODAY).slice(1)));
    expect(parseRenewalsState(params, data, TODAY, true)).toEqual(state);
  });
});

describe("renewalsPeriodMenu", () => {
  it("offers the quick ranges, each year with renewals and all time, with what was paid in each", () => {
    const menu = renewalsPeriodMenu(data, { kind: "year", year: 2026 }, TODAY);
    expect(menu.map((o) => `${o.label}${o.meta ? ` ${o.meta}` : ""}`)).toEqual([
      "Last 3 months ₹13.3k",
      "Last 6 months ₹28.3k",
      "Last 12 months ₹66.7k",
      "This year ₹57.2k",
      "2025 ₹36.5k",
      "2024 ₹10.6k",
      "2023 ₹2.3k",
      "2022 ₹1.5k",
      "All time ₹1.1L",
      "Custom range…",
    ]);
    expect(menu.find((o) => o.label === "This year")?.value).toBe("");
  });
});

describe("renewalsRangeStart", () => {
  it("opens on the period's months so far, and offers months from the first subscription's year", () => {
    expect(renewalsRangeStart(data, { kind: "year", year: 2026 }, TODAY)).toEqual({ from: "2026-01", to: "2026-10", earliest: "2022-01" });
    expect(renewalsRangeStart(data, { kind: "all" }, TODAY)).toEqual({ from: "2026-05", to: "2026-10", earliest: "2022-01" });
    expect(renewalsRangeStart(data, { kind: "year", year: 2027 }, TODAY)).toEqual({ from: "2026-05", to: "2026-10", earliest: "2022-01" });
  });
});
