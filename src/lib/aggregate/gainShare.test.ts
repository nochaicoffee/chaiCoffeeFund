import { describe, expect, it } from "vitest";
import { gainParts } from "./gainShare";

describe("gainParts", () => {
  const holdings = [
    { key: "IND:A", gainInr: 1000, split: null },
    { key: "US:B", gainInr: 3000, split: { pricePartInr: 2000, rupeePartInr: 1000 } },
    { key: "US:C", gainInr: -500, split: { pricePartInr: -800, rupeePartInr: 300 } },
  ];

  it("lists the biggest gain first and keeps price and rupee adding up to each gain", () => {
    const parts = gainParts(holdings, 3500);
    expect(parts.map((p) => p.key)).toEqual(["US:B", "IND:A", "US:C"]);
    for (const p of parts) expect(p.pricePartInr + p.rupeePartInr).toBeCloseTo(p.gainInr, 9);
  });

  it("counts all of an Indian holding's gain as price, with nothing for the rupee", () => {
    const a = gainParts(holdings, 3500).find((p) => p.key === "IND:A")!;
    expect(a).toMatchObject({ pricePartInr: 1000, rupeePartInr: 0 });
  });

  it("gives each holding that gained its share of the whole, and a loser none", () => {
    const parts = gainParts(holdings, 3500);
    expect(parts.find((p) => p.key === "US:B")!.shareOfGain).toBeCloseTo(3000 / 3500, 12);
    expect(parts.find((p) => p.key === "US:C")!.shareOfGain).toBeNull();
  });

  it("gives no shares when the whole is not a gain", () => {
    expect(gainParts(holdings, 0).every((p) => p.shareOfGain === null)).toBe(true);
    expect(gainParts(holdings, -10).every((p) => p.shareOfGain === null)).toBe(true);
  });

  it("is empty with no holdings", () => {
    expect(gainParts([], 0)).toEqual([]);
  });
});
