import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { sentenceText } from "../cards/summarySentence";
import { ALL, subscriptionsPageView, summarySentence } from "./views";

// The design's "today", so the figures are the design's (design/subscriptions/SubsFinal.dc.html).
const TODAY = "2026-10-20";
const data = demoSubscriptionData(TODAY);
const view = subscriptionsPageView(data, TODAY);
const pick = (id: string) => view.picks.find((p) => p.id === id)!;
const stats = (id: string) => pick(id).stats.map((s) => `${s.label}: ${s.value} · ${s.sub}`);

describe("summarySentence", () => {
  it("reads as the design's greeting", () => {
    expect(sentenceText(summarySentence(data, TODAY))).toBe(
      "You've paid ₹57,163 for subscriptions so far in 2026, about ₹5,716 a month. Mar 2026 was the biggest month at ₹10,032. 6 renewals come up in the next 30 days, totalling ₹4,334.",
    );
  });

  it("says so when there's nothing yet", () => {
    expect(sentenceText(summarySentence({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY))).toMatch(/^No subscriptions yet\./);
  });
});

describe("the carousel and hero", () => {
  it("puts All first, then active ones by next renewal, then paused and cancelled", () => {
    expect(view.picks.map((p) => p.alias)).toEqual(["All", "Netflix", "iCloud+", "Spotify", "Times Prime", "YouTube", "ChatGPT", "Swiggy One", "Prime", "Cult.fit", "Microsoft 365", "Headspace", "SonyLIV"]);
  });

  it("shows All as the design does", () => {
    expect(pick(ALL)).toMatchObject({ cover: { corner: "10 active", price: "₹5,559 / month" }, eyebrow: "Everything", bar: { start: "Oct 1", middle: "Next is Netflix, Fri, Oct 23", end: "Oct 31" } });
    expect(stats(ALL)).toEqual(["A month: ₹5,559 · 10 active", "Renews next: Netflix · Fri, Oct 23", "Paid this year: ₹57,163 · 61 payments", "Prices: 3 went up · ₹190 more a month"]);
  });

  it("shows a subscription due in 3 days, with its cycle and price change", () => {
    expect(pick("demo-netflix")).toMatchObject({ dueSoon: true, eyebrow: "Streaming · since Feb 23, 2024", bar: { start: "Sep 23", middle: "Renews Fri, Oct 23 · in 3 days", end: "Oct 23", fraction: 0.9 } });
    expect(stats("demo-netflix")).toEqual(["Monthly: ₹649 · ₹649 a month", "Renews: Fri, Oct 23 · in 3 days", "Paid so far: ₹16,418 · 32 payments", "Price: ↑ ₹150 · ₹499 → ₹649 on Jul 23"]);
  });

  it("puts the year on both ends of a cycle that spans two", () => {
    expect(pick("demo-timesprime").bar).toMatchObject({ start: "Oct 30, 2025", end: "Oct 30, 2026" });
  });

  it("says when a renewal paid ahead was actually paid, with the year on a date in another year", () => {
    const yearly = { id: "y", name: "Yearly Plan", alias: "Yearly", category: "Software" as const, amount: 1200, billingCycle: "Yearly" as const, billingAnchorDate: "2025-10-23", startDate: "2025-10-23", status: "Active" as const };
    const paid = (paymentDate: string) => ({ id: paymentDate, subscriptionId: "y", paymentDate, amount: 1200, status: "Paid" as const });
    const ahead = subscriptionsPageView({ subscriptions: [yearly], payments: [paid("2025-10-23"), paid("2026-10-19")], cards: [], accounts: [] }, "2026-10-21");
    expect(ahead.picks[1].bar).toMatchObject({ start: "Oct 23, 2026", middle: "Paid Oct 19 · next Sat, Oct 23, 2027", end: "Oct 23, 2027", fraction: 0 });
    expect(ahead.picks[1].stats[1]).toEqual({ label: "Renews", value: "Sat, Oct 23, 2027", sub: "in 12 months" });
  });

  it("shows paused and cancelled ones with no cycle bar", () => {
    expect(pick("demo-headspace")).toMatchObject({ muted: true, cover: { corner: "Paused" }, bar: { middle: "Paused · last paid Jul 12", fraction: null } });
    expect(stats("demo-headspace")[2]).toBe("Paid so far: ₹2,691 · 9 payments");
    expect(pick("demo-sonyliv")).toMatchObject({ cover: { corner: "Cancelled", price: "₹999 / year" }, bar: { middle: "Cancelled Sep 14 · won't renew", fraction: null } });
  });
});

describe("the map, payments and charged to", () => {
  it("sizes the map's blocks by monthly cost, with a pill for renewals within a week", () => {
    const netflix = view.blocks.find((b) => b.id === "demo-netflix")!;
    expect(netflix).toMatchObject({ monthly: 649, pill: { text: "Oct 23 · 3d", due: true } });
    expect(view.blocks.find((b) => b.id === "demo-icloud")?.pill).toEqual({ text: "Oct 24 · 4d", due: false });
    expect(view.blocks.find((b) => b.id === "demo-chatgpt")?.pill).toBeNull();
    expect(view.blocks.reduce((t, b) => t + b.share, 0)).toBeCloseTo(1, 9);
    expect(view.stopped.map((s) => `${s.alias} ${s.label}`)).toEqual(["Headspace paused", "SonyLIV cancelled"]);
  });

  it("lists the legend's categories as the design does", () => {
    expect(view.categories.map((c) => `${c.label} ${Math.round(c.monthly)}`)).toEqual(["Software 2516", "Fitness 1500", "Streaming 798", "Shopping 225", "Cloud storage 219", "Food 183", "Music 119"]);
  });

  it("gives each pick its payments, newest first", () => {
    expect(view.payments[ALL].footer).toBe("The 6 most recent of 156");
    expect(view.payments[ALL].rows[0]).toMatchObject({ mark: { alias: "Cult.fit" }, date: "Oct 10", amount: "₹4,500", chargedTo: { kind: "account", name: "Kotak Savings" } });
    expect(view.payments["demo-netflix"].footer).toBe("Showing 6 of 32 · ₹16,418 paid since Feb 23, 2024");
    expect(view.payments["demo-netflix"].history?.changes).toEqual(["₹499 → ₹649 on Jul 23, 2026"]);
    const july = view.payments["demo-netflix"].rows.find((r) => r.date === "Jul 23, 2026");
    expect(july?.change).toEqual({ text: "₹150 more", up: true });
  });

  it("splits the monthly total by where it's charged, as the design does", () => {
    expect(view.chargedTo.map((c) => `${c.chip.name} ${c.count} ${Math.round(c.monthly)}`)).toEqual(["Coral 3 2224", "Kotak Savings 2 1683", "Millennia 3 1285", "Ace 2 368"]);
    expect(view.chargedTo[0].fraction).toBe(1);
  });
});
