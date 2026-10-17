import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { ALL } from "@/lib/format/subscriptionLabels";
import { lastMonths } from "@/lib/aggregate/period";
import type { SpendPeriod } from "@/lib/aggregate/cardSpend";
import { chartView } from "./chartView";

// The design's "today", so the figures are the design's (the chart at the end of SubsFinal.dc.html).
const TODAY = "2026-10-20";
const chart = chartView(demoSubscriptionData(TODAY), TODAY);
// All time, where Lifetime cost is everything ever paid.
const everything = chartView(demoSubscriptionData(TODAY), TODAY, { kind: "all" });

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
    // This year's pill: January to December, the rest of the year expected.
    expect(chart.trend.months.map((m) => m.name).slice(0, 3)).toEqual(["Jan ’26", "Feb", "Mar"]);
    expect(chart.trend.months).toHaveLength(12);
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
    expect(everything.lifetime.rows[0]).toMatchObject({ id: "demo-chatgpt", fraction: 1, detail: "17 payments · since Jun 2025" });
    expect(everything.lifetime.rows.find((r) => r.id === "demo-headspace")?.detail).toBe("9 payments · since Nov 2025 · paused");
    expect(everything.lifetime.captions[ALL]).toMatch(/^You've paid ₹[\d,]+ across 12 subscriptions since Dec 2022\. ChatGPT is the biggest at ₹33,983\.$/);
    expect(everything.lifetime.captions["demo-netflix"]).toMatch(/^Netflix: ₹16,418 over 32 payments since Feb 23, 2024, \d+% of everything you've paid for subscriptions\.$/);
  });

  it("says so when nothing's been paid", () => {
    const empty = chartView({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY, { kind: "all" });
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
    expect(all.total).toBe(67667);
    expect(all.months["2026-08"]).toEqual({ cumulative: 47030, label: "₹47,030 by the end of Aug", note: "paid · on course for ₹67,667 in 2026" });
    expect(all.months["2026-10"].note).toBe("paid and still due · on course for ₹67,667 in 2026");
    expect(all.months["2026-11"].note).toBe("expected · on course for ₹67,667 in 2026");
    expect(all.months["2026-12"]).toMatchObject({ cumulative: 67667, note: "expected · what 2026 is on course for" });
    expect(chart.running["demo-netflix"].months["2026-12"].cumulative).toBe(chart.running["demo-netflix"].total);
    // Cult.fit renewed on Oct 10 and isn't due again this month, so October is simply paid.
    expect(chart.running["demo-cult"].months["2026-10"].note).toMatch(/^paid · /);
  });

  it("draws no running total for a pick with nothing paid or due this year", () => {
    const sub = { id: "old", name: "Old", alias: "Old", category: "Streaming" as const, amount: 99, billingCycle: "Monthly" as const, billingAnchorDate: "2025-01-05", startDate: "2025-01-05", status: "Cancelled" as const, endDate: "2025-06-01" };
    const old = chartView({ subscriptions: [sub], payments: [{ id: "p", subscriptionId: "old", paymentDate: "2025-01-05", amount: 99, status: "Paid" }], cards: [], accounts: [] }, TODAY);
    expect(old.running.old).toEqual({ total: 0, months: {} });
  });

  it("sorts Lifetime cost three ways, and gives each row what it cost each year", () => {
    const { order, rows } = everything.lifetime;
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

describe("the chart over the period pill", () => {
  const data = demoSubscriptionData(TODAY);
  const range = (from: string, to: string): SpendPeriod => ({ kind: "range", from, to });
  const paidIn = (from: string, to: string, id?: string) =>
    data.payments.filter((p) => p.status === "Paid" && p.amount > 0 && (!id || p.subscriptionId === id) && p.paymentDate.slice(0, 7) >= from && p.paymentDate.slice(0, 7) <= to).reduce((t, p) => t + p.amount, 0);

  it("opens on this year, with each view worded for it", () => {
    expect(chart.span).toBe("Jan – Dec 2026");
    expect(chart.copy).toMatchObject({ lifetimeLabel: "Total paid", lifetimeShort: "Paid", lifetime: "What you paid each one this year · open a row for each year." });
    expect(chart.copy.trend).toBe("Jan – Dec 2026, paid so far and the rest expected · the pick is drawn in its colour · the months add up as you go.");
    expect(everything.copy).toMatchObject({ lifetimeLabel: "Lifetime cost", lifetimeShort: "Lifetime", lifetime: "Everything you've paid each one, since it started · open a row for each year." });
  });

  it("draws the last 6 months as six months of days and six bars, none still to come", () => {
    const six = chartView(data, TODAY, lastMonths(6, TODAY));
    expect(six.desktopGrid.months.map((m) => m.name)).toEqual(["May", "Jun", "Jul", "Aug", "Sep", "Oct"]);
    expect(six.desktopGrid.months.map((m) => m.total)).toEqual(chart.desktopGrid.months.slice(4, 10).map((m) => m.total));
    expect(six.trend.months.map((m) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(six.span).toBe("May – Oct 2026");
    expect(six.copy.trend).toMatch(/^May – Oct 2026, paid · /);
  });

  it("totals a month the same whichever period shows it", () => {
    const six = chartView(data, TODAY, lastMonths(6, TODAY));
    expect(six.trend.months.find((m) => m.month === "2026-09")?.total).toBe(chart.trend.months.find((m) => m.month === "2026-09")?.total);
  });

  it("draws a past year whole, none of it expected", () => {
    const past = chartView(data, TODAY, { kind: "year", year: 2025 });
    expect(past.span).toBe("Jan – Dec 2025");
    expect(past.desktopGrid.months).toHaveLength(12);
    expect(past.desktopGrid.months.some((m) => m.future || m.current)).toBe(false);
    expect(past.trend.months.some((m) => m.future)).toBe(false);
    expect(past.copy.trend).toMatch(/^Jan – Dec 2025, paid · /);
  });

  it("draws the latest 12 months of all time for Day by day and the latest 24 of the trend, and says so", () => {
    expect(everything.desktopGrid.months).toHaveLength(12);
    expect(everything.trend.months).toHaveLength(24);
    expect(everything.copy.days).toMatch(/Showing the latest 12 months, Jan – Dec 2026\.$/);
    expect(everything.copy.trend).toMatch(/^The latest 24 months, Jan 2025 – Dec 2026, paid so far/);
  });

  it("adds up the third view to what was paid in the period, per subscription and in all", () => {
    const six = chartView(data, TODAY, lastMonths(6, TODAY));
    expect(six.lifetime.rows.reduce((t, r) => t + r.paid, 0)).toBe(paidIn("2026-05", "2026-10"));
    for (const r of six.lifetime.rows) expect(r.paid).toBe(paidIn("2026-05", "2026-10", r.id));
    expect(six.lifetime.captions[ALL]).toMatch(/^You've paid ₹[\d,]+ across 12 subscriptions in the last 6 months\. /);
    expect(six.lifetime.captions["demo-netflix"]).toMatch(/^Netflix: ₹2,945 over 5 payments in the last 6 months, \d+% of everything you've paid for subscriptions in the last 6 months\.$/);
    // A year in the middle of a subscription's life has its own years in the opened row.
    for (const r of chartView(data, TODAY, { kind: "year", year: 2025 }).lifetime.rows) expect(r.years.every((y) => y.year === "2025")).toBe(true);
  });

  it("says when nothing was paid in the period", () => {
    const none = chartView(data, TODAY, range("2022-01", "2022-06"));
    expect(none.lifetime.captions[ALL]).toMatch(/^Nothing paid in Jan – Jun 2022\./);
    expect(none.running[ALL]).toEqual({ total: 0, months: {} });
  });

  it("runs the total over the months drawn, ending at the period's figure", () => {
    const six = chartView(data, TODAY, lastMonths(6, TODAY));
    const months = Object.keys(six.running[ALL].months);
    expect(months).toEqual(six.trend.months.map((m) => m.month));
    expect(six.running[ALL].total).toBe(six.trend.months.reduce((t, m) => t + m.total, 0));
    // October still has renewals due, so it's where the six months are heading; a year that's over has nothing due and says what it came to.
    expect(six.running[ALL].months["2026-10"].note).toBe("paid and still due · what May – Oct 2026 is on course for");
    expect(six.running[ALL].months["2026-08"].note).toMatch(/^paid · on course for ₹[\d,]+ over May – Oct 2026$/);
    const past = chartView(data, TODAY, { kind: "year", year: 2025 }).running[ALL];
    expect(past.months["2025-12"].note).toBe("paid · the total for 2025");
    expect(past.months["2025-03"].note).toMatch(/^paid · adds up to ₹[\d,]+ in 2025$/);
    // This year's still says what it's on course for, as it always did.
    expect(chart.running[ALL].months["2026-12"].note).toBe("expected · what 2026 is on course for");
    expect(chart.running[ALL].months["2026-03"].note).toMatch(/^paid · on course for ₹[\d,]+ in 2026$/);
  });
});
