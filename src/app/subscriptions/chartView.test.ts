import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { ALL } from "@/lib/format/subscriptionLabels";
import { chartView } from "./chartView";

// The design's "today", so the figures are the design's (the chart at the end of SubsFinal.dc.html).
const TODAY = "2026-10-20";
const chart = chartView(demoSubscriptionData(TODAY), TODAY);

describe("Day by day", () => {
  it("totals each month as the design's grid does", () => {
    expect(chart.desktopGrid.months.map((m) => `${m.name} ${m.total}`)).toEqual([
      "Jan ₹7,764", "Feb ₹3,264", "Mar ₹10,032", "Apr ₹7,784", "May ₹3,284", "Jun ₹3,833",
      "Jul ₹7,934", "Aug ₹3,135", "Sep ₹3,485", "Oct ₹8,834", "Nov ₹3,135", "Dec ₹5,183",
    ]);
    expect(chart.desktopGrid.months.filter((m) => m.future).map((m) => m.name)).toEqual(["Nov", "Dec"]);
    expect(chart.desktopGrid.months.find((m) => m.current)?.name).toBe("Oct");
  });

  it("marks the not-recorded renewal and the ones still to come", () => {
    const day = (d: string) => chart.desktopGrid.days.find((x) => x.date === d);
    expect(day("2026-09-24")).toMatchObject({ kind: "missing", ids: ["demo-icloud"], label: "Sep 24: iCloud+ ₹219 (not recorded)" });
    expect(day("2026-10-23")).toMatchObject({ kind: "expected", ids: ["demo-netflix"] });
    expect(day("2026-03-03")).toMatchObject({ kind: "paid", level: 5 });
  });

  it("shows a phone August to December, in short amounts", () => {
    expect(chart.phoneGrid.months.map((m) => `${m.name} ${m.total}`)).toEqual(["Aug ₹3.1k", "Sep ₹3.5k", "Oct ₹8.8k", "Nov ₹3.1k", "Dec ₹5.2k"]);
  });
});

describe("Payment trend", () => {
  it("names the months, marks the peak, and words each month's hover card", () => {
    expect(chart.trend.months.map((m) => m.name).slice(0, 3)).toEqual(["Nov", "Dec", "Jan ’26"]);
    expect(chart.trend.peak).toBe("2026-03");
    const march = chart.trend.months.find((m) => m.month === "2026-03")!;
    expect(march.card).toMatchObject({ title: "March 2026", pill: "Paid", total: "₹10,032", diff: { text: "₹4,473 more than a usual month", up: true } });
    expect(march.card.rows[0]).toMatchObject({ label: "Microsoft 365 · Mar 3", amount: "₹6,199" });
    expect(chart.trend.months.find((m) => m.current)?.card.pill).toBe("This month");
    expect(chart.trend.months.at(-1)?.card.pill).toBe("Expected");
  });

  it("draws a usual month as All's monthly cost, a pick's as its own, and none for a stopped one", () => {
    expect(Math.round(chart.usual[ALL])).toBe(5559);
    expect(chart.usual["demo-netflix"]).toBe(649);
    expect(chart.usual["demo-headspace"]).toBe(0);
  });
});

describe("hover card rows", () => {
  it("lists the renewals in the month's total first, and notes and mutes one not recorded", () => {
    const september = chart.trend.months.find((m) => m.month === "2026-09")!;
    expect(september.card.total).toBe("₹3,485");
    // Five renewals make up the ₹3,485; iCloud+'s Sep 24 wasn't recorded, so it isn't in it and comes after them,
    // past the four shown. Before the fix it was listed at ₹219 as if it counted.
    expect(september.card.rows.map((r) => `${r.label} ${r.amount}${r.muted ? " muted" : ""}`)).toEqual(["ChatGPT · Sep 8 ₹1,999", "Netflix · Sep 23 ₹649", "Swiggy One · Sep 1 ₹549", "YouTube · Sep 2 ₹149"]);
    expect(september.card.more).toBe(2);
  });

  it("notes a pending payment, which isn't in the total either", () => {
    const sub = { id: "n", name: "Netflix", alias: "Netflix", category: "Streaming" as const, amount: 649, billingCycle: "Monthly" as const, billingAnchorDate: "2026-07-23", startDate: "2026-07-23", status: "Active" as const };
    const pending = chartView({ subscriptions: [sub], payments: [{ id: "p", subscriptionId: "n", paymentDate: "2026-08-23", amount: 649, status: "Pending" }], cards: [], accounts: [] }, TODAY);
    const august = pending.trend.months.find((m) => m.month === "2026-08")!;
    expect(august.card.total).toBe("₹0");
    expect(august.card.rows[0]).toMatchObject({ note: "pending", muted: true, amount: "₹649" });
    expect(pending.desktopGrid.days.find((d) => d.date === "2026-08-23")).toMatchObject({ kind: "pending", label: "Aug 23: Netflix ₹649 (pending)" });
  });

  it("leaves out payments whose subscription is gone, so a month's parts add up to it", () => {
    const sub = { id: "n", name: "Netflix", alias: "Netflix", category: "Streaming" as const, amount: 649, billingCycle: "Monthly" as const, billingAnchorDate: "2026-07-23", startDate: "2026-07-23", status: "Active" as const };
    const paid = (id: string, subscriptionId: string, amount: number) => ({ id, subscriptionId, paymentDate: "2026-08-23", amount, status: "Paid" as const });
    const withOrphan = chartView({ subscriptions: [sub], payments: [paid("a", "n", 649), paid("b", "deleted", 300)], cards: [], accounts: [] }, TODAY);
    const august = withOrphan.trend.months.find((m) => m.month === "2026-08")!;
    expect(august.total).toBe(649);
    expect(Object.values(august.parts).reduce((t, v) => t + v, 0)).toBe(649);
  });
});

describe("Lifetime cost", () => {
  it("lists everything paid to each one, biggest first, with its caption", () => {
    expect(chart.lifetime.rows[0]).toMatchObject({ id: "demo-chatgpt", fraction: 1, detail: "17 payments · since Jun 2025" });
    expect(chart.lifetime.rows.find((r) => r.id === "demo-headspace")?.detail).toBe("9 payments · since Nov 2025 · paused");
    expect(chart.lifetime.captions[ALL]).toMatch(/^You've paid ₹[\d,]+ across 12 subscriptions since Dec 2022\. ChatGPT is the biggest at ₹33,983\.$/);
    expect(chart.lifetime.captions["demo-netflix"]).toMatch(/^Netflix: ₹16,418 over 32 payments since Feb 23, 2024, \d+% of everything you've paid for subscriptions\.$/);
  });

  it("says so when nothing's been paid", () => {
    const empty = chartView({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY);
    expect(empty.lifetime.rows).toEqual([]);
    expect(empty.lifetime.captions[ALL]).toMatch(/^Nothing paid yet/);
    expect(empty.trend.peak).toBeNull();
  });
});

describe("the chart's interactions (#149)", () => {
  const day = (d: string) => chart.desktopGrid.days.find((x) => x.date === d)!;

  it("words each day's card: when it is, its status, each renewal with where it's charged, and the total", () => {
    expect(day("2026-10-23").card).toMatchObject({ title: "Fri, Oct 23 · in 3 days", pill: "Expected", total: "₹649", footer: "Expected, at the plan's price" });
    expect(day("2026-10-23").card.rows.map((r) => `${r.label} ${r.amount}`)).toEqual(["Netflix · Millennia ₹649"]);
    expect(day("2026-03-03").card).toMatchObject({ title: "Tue, Mar 3 · 8 months ago", pill: "Paid", total: "₹6,199", footer: null });
    expect(day("2026-03-03").record).toBeNull();
  });

  it("says a day wasn't recorded, charges it nowhere, and records that renewal when clicked", () => {
    expect(day("2026-09-24").card).toMatchObject({ title: "Thu, Sep 24 · 26 days ago", pill: "Not recorded", total: "₹219", footer: "Not recorded yet" });
    expect(day("2026-09-24").card.rows).toMatchObject([{ label: "iCloud+", amount: "₹219" }]);
    expect(day("2026-09-24").record).toEqual({ subscriptionId: "demo-icloud", renewalDate: "2026-09-24" });
    expect(chart.desktopGrid.days.filter((d) => d.record)).toHaveLength(1);
  });

  it("notes a renewal whose status the day's pill doesn't already say", () => {
    const sub = (id: string, anchor: string) => ({ id, name: id, alias: id, category: "Streaming" as const, amount: 100, billingCycle: "Monthly" as const, billingAnchorDate: anchor, startDate: anchor, status: "Active" as const });
    // On Sep 23 one was paid and one wasn't recorded: the day is drawn not recorded, and the paid one says so.
    const mixed = chartView({ subscriptions: [sub("a", "2026-08-23"), sub("b", "2026-09-23")], payments: [{ id: "p", subscriptionId: "a", paymentDate: "2026-09-23", amount: 100, status: "Paid" }], cards: [], accounts: [] }, TODAY);
    const sep23 = mixed.desktopGrid.days.find((d) => d.date === "2026-09-23")!;
    expect(sep23.card.pill).toBe("Not recorded");
    expect(sep23.card.rows.map((r) => `${r.label} ${r.note ?? ""}`.trim())).toEqual(["a paid", "b"]);
    expect(sep23.record).toEqual({ subscriptionId: "b", renewalDate: "2026-09-23" });
  });

  it("gives a range the numbers it adds up", () => {
    expect(day("2026-09-24").renewals).toEqual([{ subscriptionId: "demo-icloud", status: "missing", amount: 219 }]);
  });

  it("words each month's card, against a usual month, split by subscription", () => {
    const october = chart.desktopGrid.months[9];
    expect(october.label).toBe("October 2026: ₹8,834, this month");
    expect(october.card).toMatchObject({ title: "October 2026", pill: "This month", total: "₹8,834", diff: { text: "▲ ₹3,275 more than a usual month of ₹5,559", up: true }, footer: "7 renewals · 2 more not listed" });
    expect(october.card.rows.map((r) => `${r.label} ${r.amount}`)).toEqual(["Cult.fit ₹4,500", "ChatGPT ₹1,999", "Times Prime ₹1,199", "Netflix ₹649", "iCloud+ ₹219"]);
    expect(october.card.bar.reduce((t, p) => t + p.amount, 0)).toBe(8834);
    expect(chart.desktopGrid.months[8].card).toMatchObject({ pill: "Paid", diff: { up: false }, footer: "6 renewals · 1 not recorded" });
    expect(chart.desktopGrid.months[11].card.pill).toBe("Expected");
  });

  it("stacks each trend bar's parts in their colours, biggest first", () => {
    const march = chart.trend.months.find((m) => m.month === "2026-03")!;
    expect(march.stack[0]).toEqual({ id: "demo-m365", color: "sapphire", amount: 6199 });
    expect(march.stack.reduce((t, p) => t + p.amount, 0)).toBe(march.total);
    for (let i = 1; i < march.stack.length; i++) expect(march.stack[i].amount).toBeLessThanOrEqual(march.stack[i - 1].amount);
  });

  it("words this year's running total for each month, and where the year is heading", () => {
    const all = chart.running[ALL];
    expect(all.yearTotal).toBe(67667);
    expect(all.months["2026-08"]).toEqual({ cumulative: 47030, label: "₹47,030 by the end of Aug", note: "paid · on course for ₹67,667 in 2026" });
    expect(all.months["2026-10"].note).toBe("paid and still due · on course for ₹67,667 in 2026");
    expect(all.months["2026-11"].note).toBe("expected · on course for ₹67,667 in 2026");
    expect(all.months["2026-12"]).toMatchObject({ cumulative: 67667, note: "expected · what 2026 is on course for" });
    expect(chart.running["demo-netflix"].months["2026-12"].cumulative).toBe(chart.running["demo-netflix"].yearTotal);
    // Cult.fit renewed on Oct 10 and isn't due again this month, so October is simply paid.
    expect(chart.running["demo-cult"].months["2026-10"].note).toMatch(/^paid · /);
  });

  it("draws no running total for a pick with nothing paid or due this year", () => {
    const sub = { id: "old", name: "Old", alias: "Old", category: "Streaming" as const, amount: 99, billingCycle: "Monthly" as const, billingAnchorDate: "2025-01-05", startDate: "2025-01-05", status: "Cancelled" as const, endDate: "2025-06-01" };
    const old = chartView({ subscriptions: [sub], payments: [{ id: "p", subscriptionId: "old", paymentDate: "2025-01-05", amount: 99, status: "Paid" }], cards: [], accounts: [] }, TODAY);
    expect(old.running.old).toEqual({ yearTotal: 0, months: {} });
  });

  it("sorts Lifetime cost three ways, and gives each row what it cost each year", () => {
    const { order, rows } = chart.lifetime;
    expect(order.paid).toEqual(rows.map((r) => r.id));
    // Longest held: Prime started Dec 2022, then Spotify Jun 2023; Cult.fit, from Jan 2026, is the newest.
    expect(order.held.slice(0, 2)).toEqual(["demo-prime", "demo-spotify"]);
    expect(order.newest[0]).toBe("demo-cult");
    expect([...order.newest].reverse()).toEqual(order.held);
    const prime = rows.find((r) => r.id === "demo-prime")!;
    expect(prime.years.map((y) => `${y.year} ${y.amount}`)).toEqual(["2022 ₹1.5k", "2023 ₹1.5k", "2024 ₹1.5k", "2025 ₹1.5k"]);
    expect(prime.each).toMatch(/^4 payments · about ₹[\d,]+ each$/);
    for (const r of rows) expect(r.years.reduce((t, y) => t + y.paid, 0)).toBeCloseTo(r.paid, 6);
  });
});
