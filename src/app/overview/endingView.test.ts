import { describe, expect, it } from "vitest";
import { endingView, relative } from "./endingView";
import type { OverviewEvent } from "./events";
import type { OverviewWarning } from "./warnings";

const TODAY = "2026-11-07";
const ev = (id: string, date: string, amount: number, over: Partial<OverviewEvent> = {}): OverviewEvent => ({ id, date, label: id, sub: "", amount, kind: "emi", page: "loans", cash: true, ...over });
const w = (id: string, over: Partial<OverviewWarning> = {}): OverviewWarning => ({ id, tone: "amber", page: "loans", text: id, detail: "d", act: "Open", href: "/loans", date: null, ...over });

describe("relative", () => {
  it("says today, tomorrow, in n days, and yesterday", () => {
    expect([0, 1, 11, -1, -6].map((n) => relative(TODAY, new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)))).toEqual(["today", "tomorrow", "in 11 days", "yesterday", "6 days ago"]);
  });
});

describe("endingView", () => {
  const events = [ev("b", "2026-11-18", -41200, { ref: "statement:s1" }), ev("a", "2026-11-07", -19850, { ref: "installment:i1" }), ev("c", "2026-11-18", 5000, { cash: false }), ev("d", "2026-11-30", 248000, { kind: "income" })];
  const warnings = [w("emi", { ref: "installment:i1", tone: "red" }), w("bill", { ref: "statement:s1" }), w("free"), w("old", { ref: "installment:gone" })];
  const v = endingView(warnings, events, TODAY, "2026-12-07");
  it("groups events by day, soonest first, each day with its own events", () => {
    expect(v.days.map((d) => [d.date, d.events.length])).toEqual([["2026-11-07", 1], ["2026-11-18", 2], ["2026-11-30", 1]]);
    expect(v.days[0]).toMatchObject({ relative: "today", heading: "Sat, Nov 7" });
  });
  it("tags an event with the warning that belongs to it, and leaves the rest of the warnings as needing a look now", () => {
    expect(v.days[0].events[0].warning?.id).toBe("emi");
    expect(v.days[1].events.find((e) => e.id === "b")!.warning?.id).toBe("bill");
    expect(v.now.map((x) => x.id)).toEqual(["free", "old"]); // one with no day, one whose day is not inside the window
    expect(v.total).toBe(4);
  });
  it("formats amounts with their direction, and totals only what moves the bank", () => {
    expect(v.days[0].events[0].amount).toBe("−₹19,850");
    expect(v.days[2].events[0]).toMatchObject({ amount: "+₹2,48,000", arrives: true });
    expect(v.out).toBe("₹61,050");
    expect(v.in).toBe("₹2,48,000"); // the ₹5,000 that isn't cash is not in
  });
  it("is empty when there is nothing", () => {
    const none = endingView([], [], TODAY, "2026-12-07");
    expect(none).toMatchObject({ now: [], days: [], total: 0, out: "₹0", in: "₹0" });
  });
});
