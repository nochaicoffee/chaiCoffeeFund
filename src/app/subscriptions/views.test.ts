import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { sentenceText } from "../cards/summarySentence";
import type { Subscription, SubscriptionPayment } from "@/lib/sheets/types";
import { ALL, greetingView, subscriptionsPageView, summarySentence } from "./views";

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

  it("leaves out payments whose subscription is gone", () => {
    const orphan = { id: "gone-1", subscriptionId: "deleted", paymentDate: "2026-03-05", amount: 5000, status: "Paid" as const };
    expect(sentenceText(summarySentence({ ...data, payments: [...data.payments, orphan] }, TODAY))).toBe(sentenceText(summarySentence(data, TODAY)));
  });

  it("says so when there's nothing yet", () => {
    expect(sentenceText(summarySentence({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY))).toMatch(/^No subscriptions yet\./);
  });

  it("marks each figure with the card it points at (7A)", () => {
    const points = summarySentence(data, TODAY).filter((p) => p.point).map((p) => `${p.point}: ${p.text}`);
    expect(points).toEqual(["paid: ₹57,163", "average: ₹5,716", "biggest: Mar 2026", "biggest: ₹10,032", "next: 6 renewals", "next: ₹4,334"]);
  });
});

describe("the greeting's cards", () => {
  const cards = greetingView(data, TODAY);

  it("agree with the sentence", () => {
    expect(cards.paid).toMatchObject({ title: "Paid in 2026", total: "₹57,163", note: "10 months so far, January to October" });
    expect(greetingView(data, "2026-01-20").paid?.note).toBe("January so far");
    expect(cards.average).toMatchObject({ total: "₹5,716", note: "₹57,163 over 10 months" });
    expect(cards.biggest).toMatchObject({ title: "Mar 2026", total: "₹10,032" });
    expect(cards.next).toMatchObject({ title: "The next 30 days", total: "₹4,334" });
    expect(cards.next!.rows).toHaveLength(6);
  });

  it("lay the year out as twelve months, lit as each card points", () => {
    expect(cards.paid!.months.map((m) => m.initial).join("")).toBe("JFMAMJJASOND");
    expect(cards.paid!.months.filter((m) => m.lit)).toHaveLength(10);
    expect(cards.paid!.months.filter((m) => m.future).map((m) => m.key)).toEqual(["2026-11", "2026-12"]);
    expect(cards.biggest!.months.filter((m) => m.lit).map((m) => m.key)).toEqual(["2026-03"]);
    expect(cards.paid!.months.reduce((t, m) => t + m.paid, 0)).toBeCloseTo(57163, 0);
  });

  it("split the biggest month by subscription, biggest first, adding up to it", () => {
    const amounts = cards.biggest!.rows.map((r) => Number(r.amount.replace(/[₹,]/g, "")));
    expect(amounts.reduce((t, a) => t + a, 0)).toBe(10032);
    for (let i = 1; i < amounts.length; i++) expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i]);
  });

  it("have nothing to show with no subscriptions", () => {
    expect(greetingView({ subscriptions: [], payments: [], cards: [], accounts: [] }, TODAY)).toEqual({});
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

  it("gives each block a hover card: its price, its share of the total, its next renewal, where it's charged and what's been paid", () => {
    expect(view.blocks.find((b) => b.id === "demo-netflix")!.card).toEqual({
      name: "Netflix Premium",
      price: "₹649 a month",
      share: "12% of your ₹5,559 a month",
      renews: "Oct 23 · in 3 days",
      chargedTo: { kind: "card", name: "Millennia", color: expect.any(String) },
      paid: "₹16,418 · 32 payments",
      change: { text: "₹150 more since Jul 23", up: true },
    });
    const icloud = view.blocks.find((b) => b.id === "demo-icloud")!.card;
    expect(icloud).toMatchObject({ price: "₹219 a month", share: "4% of your ₹5,559 a month", change: null });
  });

  it("gives each block its category, for By category", () => {
    expect(view.blocks.find((b) => b.id === "demo-icloud")).toMatchObject({ category: "Cloud-Storage", categoryLabel: "Cloud storage", categoryColor: "violet" });
  });

  it("says what a paused or cancelled one would add a month if it started again, for its ghost", () => {
    expect(view.stopped.map((s) => `${s.alias} ${Math.round(s.monthly)} ${s.ghost}`)).toEqual(["Headspace 299 if you resume it", "SonyLIV 83 if you restart it"]);
  });


  it("gives each pick its payments, newest first", () => {
    expect(view.payments[ALL].footer).toBe("The 6 most recent of 156");
    expect(view.payments[ALL].rows[0]).toMatchObject({ mark: { alias: "Cult.fit" }, date: "Oct 10", amount: "₹4,500", chargedTo: { kind: "account", name: "Kotak Savings" } });
    expect(view.payments["demo-netflix"].footer).toBe("Showing 6 of 32 · ₹16,418 paid since Feb 23, 2024");
    expect(view.payments["demo-netflix"].history?.changes).toEqual(["₹499 → ₹649 on Jul 23, 2026"]);
    const july = view.payments["demo-netflix"].rows.find((r) => r.date === "Jul 23, 2026");
    expect(july?.change).toEqual({ text: "₹150 more", up: true });
  });

  it("gives each Charged to row its subscriptions and what lands next there", () => {
    const coral = view.chargedTo.find((c) => c.chip.name === "Coral")!;
    expect(coral.members.map((m) => m.alias)).toEqual(["ChatGPT", "Prime", "Times Prime"]);
    expect(coral.next).toMatchObject({ title: "Next statement Nov 2", total: "₹3,198" });
    expect(coral.next.rows.map((r) => `${r.mark.alias} ${r.date} ${r.amount} ${r.note}`)).toEqual(["ChatGPT Oct 8 ₹1,999 charged", "Times Prime Oct 30 ₹1,199 in 10 days"]);
    const kotak = view.chargedTo.find((c) => c.chip.name === "Kotak Savings")!;
    expect(kotak.next).toMatchObject({ title: "Next from Kotak Savings", total: null });
    expect(kotak.next.rows[0]).toMatchObject({ date: "Dec 1", amount: "₹549" });
  });

  it("says whose each payment is, so a row can point at its block", () => {
    expect(view.payments[ALL].rows[0]).toMatchObject({ subscriptionId: "demo-cult" });
  });

  it("splits the monthly total by where it's charged, as the design does", () => {
    expect(view.chargedTo.map((c) => `${c.chip.name} ${c.count} ${Math.round(c.monthly)}`)).toEqual(["Coral 3 2224", "Kotak Savings 2 1683", "Millennia 3 1285", "Ace 2 368"]);
    expect(view.chargedTo[0].fraction).toBe(1);
  });
});

describe("the map's hover cards, at the edges", () => {
  const sub = (over: Partial<Subscription> & Pick<Subscription, "id">): Subscription => ({
    name: over.id,
    alias: over.id,
    category: "Software",
    amount: 100,
    billingCycle: "Monthly",
    billingAnchorDate: "2026-01-05",
    startDate: "2026-01-05",
    status: "Active",
    color: "Ruby",
    ...over,
  });
  const paid = (subscriptionId: string, paymentDate: string, amount: number): SubscriptionPayment => ({ id: `${subscriptionId}-${paymentDate}`, subscriptionId, paymentDate, amount, status: "Paid" });
  const edges = subscriptionsPageView(
    {
      subscriptions: [sub({ id: "Big", amount: 50000 }), sub({ id: "Tiny", name: "Tiny Plan", category: "Music" }), sub({ id: "Cheaper", amount: 1000 })],
      payments: [paid("Cheaper", "2026-08-05", 1200), paid("Cheaper", "2026-09-05", 1000), paid("Cheaper", "2026-10-05", 1000)],
      cards: [],
      accounts: [],
    },
    TODAY,
  );
  const card = (id: string) => edges.blocks.find((b) => b.id === id)!.card;

  it("says Under 1% for a sliver of the total, rather than rounding it to 0", () => {
    expect(card("Tiny").share).toBe("Under 1% of your ₹51,100 a month");
  });

  it("says Nothing yet before the first payment, and where it isn't charged", () => {
    expect(card("Tiny")).toMatchObject({ name: "Tiny Plan", paid: "Nothing yet", chargedTo: { kind: "none" } });
  });

  it("shows a price that went down as less", () => {
    expect(card("Cheaper")).toMatchObject({ paid: "₹3,200 · 3 payments", change: { text: "₹200 less since Sep 5", up: false } });
  });

  it("spells out only the latest three price changes, and counts the rest", () => {
    const steps = subscriptionsPageView(
      { subscriptions: [sub({ id: "Steps", amount: 600 })], payments: [100, 200, 300, 400, 500, 600].map((a, i) => paid("Steps", `2026-0${i + 4}-05`, a)), cards: [], accounts: [] },
      TODAY,
    );
    expect(steps.payments.Steps.history).toMatchObject({
      changes: ["₹300 → ₹400 on Jul 5, 2026", "₹400 → ₹500 on Aug 5, 2026", "₹500 → ₹600 on Sep 5, 2026"],
      earlier: "and 2 earlier changes",
    });
    expect(view.payments["demo-netflix"].history?.earlier).toBeNull();
  });
});
