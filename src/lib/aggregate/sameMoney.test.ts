import { describe, expect, it } from "vitest";
import { sameMoneyIn } from "./sameMoney";

describe("sameMoneyIn", () => {
  it("grows each deposit with the line from its own day", () => {
    // 100 in on day 0 (line 100), the line doubles, 100 more in on day 1 (line 200), the line is 220 on day 2
    expect(sameMoneyIn([100, 200, 220], [100, 100, 0])).toBeCloseTo((100 * 2 + 100) * 1.1, 9);
  });

  it("takes a sale out at the line's level that day", () => {
    expect(sameMoneyIn([100, 100], [100, -40])).toBe(60);
  });

  it("is what he put in, with no growth, when the line is flat", () => {
    expect(sameMoneyIn([5, 5, 5], [10, 20, 0])).toBe(30);
  });

  it("carries money through a day with no level, without growth", () => {
    expect(sameMoneyIn([100, null, 200], [100, 50, 0])).toBeCloseTo(300, 9); // (100 + 50 carried) at 100 then doubled
  });

  it("is null when money arrived before the line has any level, and when the line never has one", () => {
    expect(sameMoneyIn([null, 100, 110], [100, 0, 0])).toBeNull();
    expect(sameMoneyIn([null, null], [0, 0])).toBeNull();
  });

  it("starts from the first level when nothing arrived before it", () => {
    expect(sameMoneyIn([null, 100, 150], [0, 100, 0])).toBeCloseTo(150, 9);
  });

  it("treats a zero or NaN level as no level, so one bad close can't poison the line", () => {
    expect(sameMoneyIn([100, 0, 200], [100, 0, 0])).toBeCloseTo(200, 9);
    expect(sameMoneyIn([100, Number.NaN, 200], [100, 0, 0])).toBeCloseTo(200, 9);
    expect(sameMoneyIn([0, 100, 150], [0, 100, 0])).toBeCloseTo(150, 9);
  });

  it("is null for no days", () => {
    expect(sameMoneyIn([], [])).toBeNull();
  });
});
