import { describe, expect, it } from "vitest";
import { allocateNewMoney, bucketOf, bucketStates, limitChecks, type TargetHolding } from "./targets";

const h = (o: Partial<TargetHolding & { name: string }>): TargetHolding & { name: string } => ({ symbol: "X", name: "Ex", market: "US", assetType: "Equity", valueInr: 100, ...o });
const book = [
  h({ symbol: "NTAP", name: "NetApp", market: "US", valueInr: 600_000 }),
  h({ symbol: "NIFTYBEES", name: "Nifty BeES", market: "IND", assetType: "ETF", valueInr: 200_000 }),
  h({ symbol: "LIQUID", name: "Liquid fund", market: "IND", assetType: "Debt-Fund", valueInr: 100_000 }),
  h({ symbol: "GOLDBEES", name: "Gold BeES", market: "IND", assetType: "Gold", valueInr: 50_000 }),
  h({ symbol: "MISC", name: "Misc", market: "IND", assetType: "Other", valueInr: 50_000 }),
];

describe("bucketOf", () => {
  it("puts shares and funds of shares in their market's bucket, debt and gold in theirs, and anything else nowhere", () => {
    expect(bucketOf({ market: "IND", assetType: "Equity" })).toBe("India-Equity");
    expect(bucketOf({ market: "IND", assetType: "Mutual-Fund" })).toBe("India-Equity");
    expect(bucketOf({ market: "US", assetType: "ETF" })).toBe("US-Equity");
    expect(bucketOf({ market: "IND", assetType: "Debt-Fund" })).toBe("Debt");
    expect(bucketOf({ market: "IND", assetType: "Gold" })).toBe("Gold");
    expect(bucketOf({ market: "IND", assetType: "Other" })).toBeNull();
  });
});

describe("bucketStates", () => {
  const states = bucketStates(book, { "US-Equity": 50, "India-Equity": 30, Debt: 10, Gold: 10 })!;

  it("shares everything held, with what is in no bucket counted in the total but in none of them", () => {
    expect(states.totalInr).toBe(1_000_000);
    expect(states.otherInr).toBe(50_000);
    expect(states.buckets.map((b) => b.bucket)).toEqual(["India-Equity", "US-Equity", "Debt", "Gold"]);
    expect(states.buckets.map((b) => b.share)).toEqual([0.2, 0.6, 0.1, 0.05]);
  });

  it("says how far each is below (positive) or above (negative) its target, in rupees", () => {
    expect(states.buckets.map((b) => b.shortInr)).toEqual([100_000, -100_000, 0, 50_000]);
  });

  it("has no shortfall for a bucket with no target", () => {
    const some = bucketStates(book, { Gold: 10 })!;
    expect(some.buckets.find((b) => b.bucket === "US-Equity")).toMatchObject({ target: null, shortInr: null });
    expect(some.buckets.find((b) => b.bucket === "Gold")).toMatchObject({ target: 0.1, shortInr: 50_000 });
  });

  it("is null with nothing worth anything", () => {
    expect(bucketStates([], {})).toBeNull();
    expect(bucketStates([h({ valueInr: 0 })], {})).toBeNull();
  });
});

describe("allocateNewMoney", () => {
  const states = bucketStates(book, { "US-Equity": 50, "India-Equity": 30, Debt: 10, Gold: 10 })!;
  const add = (amount: number) => Object.fromEntries(allocateNewMoney(states, amount)!.map((a) => [a.bucket, a.addInr]));

  it("sends it only to buckets below target, in proportion to how far below, and never to one above", () => {
    // India is ₹1L short and Gold ₹50k: 2 to 1. US is over target, Debt is on it.
    const a = add(90_000);
    expect(a["India-Equity"]).toBeCloseTo(60_000, 6);
    expect(a.Gold).toBeCloseTo(30_000, 6);
    expect(a["US-Equity"]).toBe(0);
    expect(a.Debt).toBe(0);
  });

  it("fills the shortfall first and then spreads the rest by target weight", () => {
    // ₹1.5L covers the shortfall exactly; ₹2.5L leaves ₹1L to go by weight (50/30/10/10).
    expect(add(150_000)["India-Equity"]).toBeCloseTo(100_000, 6);
    const a = add(250_000);
    expect(a["India-Equity"]).toBeCloseTo(100_000 + 30_000, 6);
    expect(a["US-Equity"]).toBeCloseTo(50_000, 6);
    expect(a.Debt).toBeCloseTo(10_000, 6);
    expect(a.Gold).toBeCloseTo(50_000 + 10_000, 6);
  });

  it("always adds up to what was put in, and is never negative", () => {
    for (const amount of [1, 50_000, 150_000, 500_000, 2_000_000]) {
      const parts = allocateNewMoney(states, amount)!;
      expect(parts.reduce((s, p) => s + p.addInr, 0)).toBeCloseTo(amount, 6);
      expect(parts.every((p) => p.addInr >= 0)).toBe(true);
    }
  });

  it("weights only the buckets that have a target, when the targets don't add to 100", () => {
    const part = bucketStates(book, { "US-Equity": 20, Gold: 20 })!;
    // US is far above its 20% and Gold below: money goes to Gold only until it is level.
    const parts = Object.fromEntries(allocateNewMoney(part, 100_000)!.map((p) => [p.bucket, p.addInr]));
    expect(Object.keys(parts).sort()).toEqual(["Gold", "US-Equity"]);
    expect(parts.Gold).toBeCloseTo(100_000, 6);
    expect(parts["US-Equity"]).toBe(0);
  });

  it("is null with no target set or nothing to add", () => {
    expect(allocateNewMoney(bucketStates(book, {})!, 100_000)).toBeNull();
    expect(allocateNewMoney(states, 0)).toBeNull();
  });
});

describe("limitChecks", () => {
  it("checks each limit he has set against today, in the design's order, and skips the ones he hasn't", () => {
    const checks = limitChecks(book, { "Single-Companies": 50, "One-Holding": 30 });
    expect(checks.map((c) => c.name)).toEqual(["One-Holding", "Single-Companies"]);
  });

  it("marks a ceiling broken when he holds more than it, by how many points, and one met as within", () => {
    const [one, dollars] = limitChecks(book, { "One-Holding": 30, Dollars: 70 });
    expect(one).toMatchObject({ kind: "max", nowPercent: 60, breached: true, byPoints: 30 });
    expect(one.detail).toBe("NetApp is 60%");
    expect(dollars).toMatchObject({ nowPercent: 60, breached: false, byPoints: 0 });
  });

  it("marks the debt floor broken when he holds less than it, and met when he holds at least it", () => {
    expect(limitChecks(book, { "Debt-Floor": 15 })[0]).toMatchObject({ kind: "min", nowPercent: 10, breached: true, byPoints: 5 });
    expect(limitChecks(book, { "Debt-Floor": 10 })[0]).toMatchObject({ breached: false, byPoints: 0 });
  });

  it("counts single companies as shares in a company, not funds", () => {
    const [singles] = limitChecks(book, { "Single-Companies": 50 });
    expect(singles.nowPercent).toBe(60);
    expect(singles.detail).toBe("60% is in single companies");
  });

  it("has nothing with nothing held", () => {
    expect(limitChecks([], { Dollars: 70 })).toEqual([]);
  });
});
