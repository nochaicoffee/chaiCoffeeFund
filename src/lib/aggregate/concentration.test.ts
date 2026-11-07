import { describe, expect, it } from "vitest";
import { concentration } from "./concentration";

describe("concentration", () => {
  it("with equal holdings, is as many as there are: half takes half of them, and 'like holding' is all of them", () => {
    const c = concentration([0.25, 0.25, 0.25, 0.25])!;
    expect(c).toMatchObject({ forHalf: 2, forEighty: 4 });
    expect(c.likeHolding).toBeCloseTo(4, 12);
  });

  it("with one holding, is one in every way", () => {
    expect(concentration([1])).toMatchObject({ forHalf: 1, forEighty: 1, likeHolding: 1 });
  });

  it("counts the biggest first, and reaching the line exactly is enough", () => {
    // 0.5 is half on its own; 0.5 + 0.3 is 80% exactly.
    const c = concentration([0.2, 0.3, 0.5])!;
    expect(c.forHalf).toBe(1);
    expect(c.forEighty).toBe(2);
  });

  it("is not thrown by shares that add to a hair under or over one", () => {
    const tenths = Array.from({ length: 10 }, () => 0.1);
    expect(concentration(tenths)).toMatchObject({ forHalf: 5, forEighty: 8 });
    expect(concentration(tenths.map((s) => s * 0.999999))).toMatchObject({ forHalf: 5, forEighty: 8 });
  });

  it("works the 'like holding' sum: 1 over the sum of the squares", () => {
    expect(concentration([0.5, 0.25, 0.25])!.likeHolding).toBeCloseTo(1 / (0.25 + 0.0625 + 0.0625), 12);
  });

  it("falls toward one as one holding dominates", () => {
    expect(concentration([0.97, 0.01, 0.01, 0.01])!.likeHolding).toBeLessThan(1.1);
  });

  it("scales shares that don't add to one", () => {
    expect(concentration([2, 2, 2, 2])).toMatchObject({ forHalf: 2, forEighty: 4 });
  });

  it("has nothing with nothing held", () => {
    expect(concentration([])).toBeNull();
    expect(concentration([0, 0])).toBeNull();
    expect(concentration([NaN, NaN])).toBeNull();
  });
});
