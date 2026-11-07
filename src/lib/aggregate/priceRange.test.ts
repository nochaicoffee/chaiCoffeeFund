import { describe, expect, it } from "vitest";
import { yearRange } from "./priceRange";

const day = (n: number) => new Date(Date.parse("2025-01-01T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const series = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ date: day(i), price: f(i) }));

describe("yearRange", () => {
  it("is the low and high of the last year, and where the last close sits between them", () => {
    // 500 days, price 100 then a spike to 200 on day 400 and back to 150: the last 365 days start after day 135.
    const pts = series(500, (i) => (i === 400 ? 200 : i === 10 ? 50 : i === 499 ? 150 : 100));
    const r = yearRange(pts, day(499))!;
    expect(r).toMatchObject({ low: 100, high: 200, full: true });
    expect(r.position).toBeCloseTo(0.5, 12);
  });

  it("leaves out closes older than a year, so a long-ago low doesn't count", () => {
    const pts = series(500, (i) => (i === 10 ? 1 : 100 + (i === 499 ? 10 : 0)));
    expect(yearRange(pts, day(499))!.low).toBe(100);
  });

  it("says it isn't a full year when the closes begin later", () => {
    const pts = series(120, (i) => 100 + i);
    const r = yearRange(pts, day(119))!;
    expect(r.full).toBe(false);
    expect(r.from).toBe(day(0));
    expect(r).toMatchObject({ low: 100, high: 219, position: 1 });
  });

  it("sits in the middle when the price never moved", () => {
    expect(yearRange(series(30, () => 50), day(29))).toMatchObject({ low: 50, high: 50, position: 0.5 });
  });

  it("has nothing with no closes in the year", () => {
    expect(yearRange([], "2026-01-01")).toBeNull();
    expect(yearRange(series(5, () => 1), "2030-01-01")).toBeNull();
  });
});
