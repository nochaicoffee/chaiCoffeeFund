import { describe, expect, it } from "vitest";
import { runScenario, scenarios, type WhatIfHolding } from "./whatIf";

const h = (o: Partial<WhatIfHolding>): WhatIfHolding => ({ key: "k", market: "US", assetType: "Equity", employer: false, valueInr: 100_000, ...o });
const holdings = [
  h({ key: "US:NTAP", employer: true, valueInr: 600_000 }),
  h({ key: "US:ZS", valueInr: 200_000 }),
  h({ key: "IND:NIFTYBEES", market: "IND", assetType: "ETF", valueInr: 150_000 }),
  h({ key: "IND:GOLD", market: "IND", assetType: "Gold", valueInr: 50_000 }),
];
const cost = 700_000; // worth 1,000,000: a gain of 300,000
const by = (key: string) => scenarios("NetApp").find((s) => s.key === key)!;

describe("scenarios", () => {
  it("moves only what the shock names, and counts a moving rupee as the dollar holdings' move", () => {
    const run = runScenario(holdings, by("usdn").factor, cost);
    expect(run.changeInr).toBeCloseTo(-0.05 * 800_000, 6);
    expect(run.changes.find((c) => c.key === "IND:GOLD")!.changeInr).toBe(0);
  });

  it("takes an Indian equity shock from stocks and funds in India, not gold or US shares", () => {
    const run = runScenario(holdings, by("in20").factor, cost);
    expect(run.changes.filter((c) => c.changeInr !== 0).map((c) => c.key)).toEqual(["IND:NIFTYBEES"]);
    expect(run.changeInr).toBeCloseTo(-30_000, 6);
  });

  it("takes the employer shock from the shares from his employer's plans, named in its label", () => {
    expect(by("emp30").label).toBe("NetApp −30%");
    expect(runScenario(holdings, by("emp30").factor, cost).changeInr).toBeCloseTo(-180_000, 6);
  });

  it("takes a broad equity fall from everything but gold", () => {
    expect(runScenario(holdings, by("eq15").factor, cost).changeInr).toBeCloseTo(-0.15 * 950_000, 6);
  });

  it("says the new worth, the gain left, and how much of today's gain the shock takes", () => {
    const run = runScenario(holdings, by("us20").factor, cost);
    expect(run.valueInr).toBeCloseTo(1_000_000 - 160_000, 6);
    expect(run.gainAfterInr).toBeCloseTo(140_000, 6);
    expect(run.shareOfTodaysGain).toBeCloseTo(160_000 / 300_000, 9);
    expect(run.changeFraction).toBeCloseTo(-0.16, 9);
  });

  it("has no share of the gain when today has none, and says when a shock touches nothing", () => {
    expect(runScenario(holdings, by("us20").factor, 1_100_000).shareOfTodaysGain).toBeNull();
    const noGold = runScenario(holdings.slice(0, 3), by("gold10").factor, cost);
    expect(noGold.touchesNothing).toBe(true);
    expect(noGold.changeInr).toBe(0);
  });
});
