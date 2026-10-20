import { describe, expect, it } from "vitest";
import { digitColumns } from "./digitColumns";

describe("digitColumns", () => {
  it("counts places from the right, so Indian grouping keeps its commas in the same columns", () => {
    const small = digitColumns("₹78,900");
    const large = digitColumns("₹1,23,105");
    const commaPlaces = (cols: ReturnType<typeof digitColumns>) => cols.filter((c) => c.char === ",").map((c) => c.place);
    expect(commaPlaces(small)).toEqual([3]);
    expect(commaPlaces(large)).toEqual([6, 3]);
    expect(small.map((c) => c.digit)).toEqual([null, 7, 8, null, 9, 0, 0]);
    expect(small[small.length - 1].place).toBe(0);
  });

  it("rolls only digits, not the rupee sign, a point or a percent", () => {
    expect(digitColumns("4.2%").map((c) => c.digit)).toEqual([4, null, 2, null]);
  });
});
