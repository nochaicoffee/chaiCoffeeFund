import { describe, expect, it } from "vitest";
import { allFacts, carouselOrder, chargedToSplit, latestPayments, nextRenewal, priceHistory, subscriptionFacts } from "./subscriptionPage";
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

describe("nextRenewal", () => {
  it("is the next renewal not paid yet", () => {
    expect(nextRenewal(sub(), [pay("2026-09-23", 649)], TODAY)?.date).toBe("2026-10-23");
    // Marked paid ahead: the one after it is next.
    expect(nextRenewal(sub(), [pay("2026-09-23", 649), pay("2026-10-23", 649)], TODAY)?.date).toBe("2026-11-23");
  });

  it("is null for a paused or cancelled subscription", () => {
    expect(nextRenewal(sub({ status: "Paused" }), [], TODAY)).toBeNull();
    expect(nextRenewal(sub({ status: "Cancelled" }), [], TODAY)).toBeNull();
  });
});

describe("carouselOrder", () => {
  it("puts active ones by next renewal, soonest first, then paused, then cancelled", () => {
    const subs = [
      sub({ id: "late", alias: "Late", billingAnchorDate: "2026-07-30", startDate: "2026-07-30" }),
      sub({ id: "gone", alias: "Gone", status: "Cancelled" }),
      sub({ id: "soon", alias: "Soon", billingAnchorDate: "2026-07-22", startDate: "2026-07-22" }),
      sub({ id: "rest", alias: "Rest", status: "Paused" }),
      sub({ id: "mid", alias: "Mid" }),
    ];
    expect(carouselOrder(subs, [], TODAY).map((s) => s.id)).toEqual(["soon", "mid", "late", "rest", "gone"]);
  });
});

describe("subscriptionFacts", () => {
  const payments = [pay("2026-07-23", 499), pay("2026-08-23", 649), pay("2026-09-23", 649), pay("2026-09-25", 0, { status: "Skipped", subscriptionId: "other" })];

  it("gives the cycle it's in, what it's paid and its last price change", () => {
    expect(subscriptionFacts(sub(), payments, TODAY)).toMatchObject({
      monthly: 649,
      yearly: 649 * 12,
      next: { date: "2026-10-23", status: "upcoming" },
      bar: { from: "2026-09-23", to: "2026-10-23", fraction: 28 / 30 },
      paid: 499 + 649 + 649,
      payments: 3,
      lastChange: { date: "2026-08-23", from: 499, to: 649 },
      lastCharged: { paymentDate: "2026-09-23" },
    });
  });

  it("starts the next cycle once the renewal ahead is marked paid", () => {
    const facts = subscriptionFacts(sub(), [...payments, pay("2026-10-23", 649)], TODAY);
    expect(facts.bar).toMatchObject({ from: "2026-10-23", to: "2026-11-23", fraction: 0, settledAhead: { date: "2026-10-23", status: "paid" } });
    expect(facts.next?.date).toBe("2026-11-23");
  });

  it("has no bar or next renewal when paused", () => {
    expect(subscriptionFacts(sub({ status: "Paused" }), payments, TODAY)).toMatchObject({ bar: null, next: null, lastCharged: { paymentDate: "2026-09-23" } });
  });
});

describe("allFacts", () => {
  const netflix = sub();
  const prime = sub({ id: "prime", alias: "Prime", amount: 1499, billingCycle: "Yearly", billingAnchorDate: "2025-11-05", startDate: "2025-11-05" });
  const paused = sub({ id: "paused", alias: "Paused", status: "Paused", amount: 299 });
  const payments = [
    pay("2025-11-05", 1299, { subscriptionId: "prime" }),
    pay("2026-07-23", 499),
    pay("2026-08-23", 649),
    pay("2026-09-23", 649),
    pay("2026-10-02", 299, { subscriptionId: "paused" }),
  ];

  it("totals the active ones and finds the soonest renewal", () => {
    const facts = allFacts([netflix, prime, paused], payments, TODAY);
    expect(facts).toMatchObject({ active: 2, monthly: 649 + 1499 / 12, yearly: (649 + 1499 / 12) * 12, next: { subscriptionId: "netflix", date: "2026-10-23" } });
  });

  it("splits this month into paid so far and still to come", () => {
    // Paid: the paused one's ₹299 on Oct 2. To come: Netflix on Oct 23.
    expect(allFacts([netflix, prime, paused], payments, TODAY).month).toEqual({ from: "2026-10-01", to: "2026-10-31", paid: 299, toCome: 649, fraction: 299 / (299 + 649) });
  });

  it("counts this year's payments, and the price rises this year as more a month", () => {
    const facts = allFacts([netflix, prime, paused], payments, TODAY);
    expect(facts.yearPaid).toBe(499 + 649 + 649 + 299);
    expect(facts.yearPayments).toBe(4);
    expect(facts.rises).toEqual({ count: 1, monthlyMore: 150 });
  });

  it("counts the net change over the year, so a promo that ends isn't a rise", () => {
    const promo = [pay("2025-12-23", 649), pay("2026-02-23", 324), pay("2026-03-23", 649), pay("2026-09-23", 649)];
    expect(allFacts([sub({ billingAnchorDate: "2025-12-23", startDate: "2025-12-23" })], promo, TODAY).rises).toEqual({ count: 0, monthlyMore: 0 });
    // A rise that's partly given back still counts for what's left of it.
    const partly = [pay("2025-12-23", 500), pay("2026-02-23", 700), pay("2026-03-23", 600)];
    expect(allFacts([sub({ billingAnchorDate: "2025-12-23", startDate: "2025-12-23" })], partly, TODAY).rises).toEqual({ count: 1, monthlyMore: 100 });
  });

  it("compares one that started this year from its first payment", () => {
    const started = [pay("2026-02-23", 499), pay("2026-06-23", 649)];
    expect(allFacts([sub({ billingAnchorDate: "2026-02-23", startDate: "2026-02-23" })], started, TODAY).rises).toEqual({ count: 1, monthlyMore: 150 });
    expect(allFacts([sub({ billingAnchorDate: "2026-02-23", startDate: "2026-02-23" })], [pay("2026-02-23", 499)], TODAY).rises).toEqual({ count: 0, monthlyMore: 0 });
  });

  it("turns a yearly rise into its monthly share", () => {
    const rise = [...payments, pay("2026-11-05", 1499, { subscriptionId: "prime" })];
    // Prime's rise is in November, so on Dec 1 it counts: ₹200 a year is ₹200 ÷ 12 a month.
    expect(allFacts([netflix, prime], rise, "2026-12-01").rises).toEqual({ count: 2, monthlyMore: 150 + 200 / 12 });
  });

  it("is all zeros with nothing yet", () => {
    expect(allFacts([], [], TODAY)).toMatchObject({ active: 0, monthly: 0, next: null, yearPaid: 0, rises: { count: 0, monthlyMore: 0 }, month: { paid: 0, toCome: 0, fraction: 0 } });
  });
});

describe("latestPayments", () => {
  const payments = [
    pay("2026-07-23", 499),
    pay("2026-08-23", 649),
    pay("2026-09-23", 659),
    pay("2026-09-28", 139, { subscriptionId: "spotify" }),
    pay("2026-10-23", 0, { status: "Skipped" }),
  ];

  it("lists the newest first, each with a change of 2% or more from the one before", () => {
    const { rows, count, paid } = latestPayments(payments, 4);
    expect(rows.map((r) => [r.payment.paymentDate, r.change])).toEqual([
      ["2026-10-23", null],
      ["2026-09-28", null],
      ["2026-09-23", null],
      ["2026-08-23", 150],
    ]);
    expect(count).toBe(5);
    expect(paid).toBe(499 + 649 + 659 + 139);
  });

  it("narrows to one subscription", () => {
    const { rows, count } = latestPayments(payments, 10, "spotify");
    expect(rows.map((r) => r.payment.paymentDate)).toEqual(["2026-09-28"]);
    expect(count).toBe(1);
  });
});

describe("priceHistory", () => {
  it("is each charged payment, oldest first", () => {
    expect(priceHistory([pay("2026-08-23", 649), pay("2026-07-23", 499), pay("2026-09-23", 0, { status: "Skipped" })], "netflix")).toEqual([
      { date: "2026-07-23", amount: 499 },
      { date: "2026-08-23", amount: 649 },
    ]);
  });
});

describe("chargedToSplit", () => {
  const subs = [
    sub({ id: "a", amount: 649, defaultPaidFromCardId: "card-1" }),
    sub({ id: "b", amount: 1200, billingCycle: "Quarterly", category: "Fitness", defaultPaidFromAccountId: "acc-1" }),
    sub({ id: "c", amount: 119, category: "Music", defaultPaidFromCardId: "card-1" }),
    sub({ id: "d", amount: 99, category: "Other" }),
    sub({ id: "e", amount: 999, status: "Paused", defaultPaidFromCardId: "card-2" }),
  ];

  it("adds active subscriptions' monthly cost by where they're charged, biggest first", () => {
    expect(chargedToSplit(subs)).toEqual([
      { kind: "card", id: "card-1", monthly: 649 + 119, count: 2 },
      { kind: "account", id: "acc-1", monthly: 400, count: 1 },
      { kind: "none", id: null, monthly: 99, count: 1 },
    ]);
  });
});
