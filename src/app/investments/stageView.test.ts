import { describe, expect, it } from "vitest";
import { inRange, lensWindow, linePath, offeredLensRanges, offeredRanges, rangeStart, readingAt, scaleOf, type StagePoint } from "./stageView";

const series = (n: number): StagePoint[] => Array.from({ length: n }, (_, i) => ({ date: `d${i}`, value: 100 + i, cost: 90 }));

describe("inRange", () => {
  it("takes the last N days, so 30 days is 31 points counting today", () => {
    const r = inRange(series(500), "1M");
    expect(r).toHaveLength(31);
    expect(r.at(-1)!.date).toBe("d499");
    expect(r[0].date).toBe("d469");
  });

  it("is all of it for All, and for a range longer than the history", () => {
    expect(inRange(series(100), "All")).toHaveLength(100);
    expect(inRange(series(100), "1Y")).toHaveLength(100);
  });
});

describe("offeredRanges", () => {
  it("leaves out a range longer than the history, and always offers All", () => {
    expect(offeredRanges(series(100))).toEqual(["1M", "3M", "All"]);
    expect(offeredRanges(series(1300))).toEqual(["1M", "3M", "6M", "1Y", "3Y", "All"]);
    expect(offeredRanges(series(5))).toEqual(["All"]);
  });
});

describe("readingAt", () => {
  it("says what it was worth, what it cost and the gain on a day", () => {
    expect(readingAt(series(10), 3)).toEqual({ date: "d3", value: 103, cost: 90, gain: 13, gainFraction: 13 / 90 });
  });

  it("stays on the line when asked past either end, and has none for an empty line", () => {
    expect(readingAt(series(10), 99)!.date).toBe("d9");
    expect(readingAt(series(10), -5)!.date).toBe("d0");
    expect(readingAt([], 0)).toBeNull();
  });

  it("has no fraction when it cost nothing", () => {
    expect(readingAt([{ date: "d", value: 5, cost: 0 }], 0)!.gainFraction).toBeNull();
  });
});

describe("scaleOf and linePath", () => {
  it("covers both lines with room to spare, and never goes below zero", () => {
    const s = scaleOf([{ date: "a", value: 100, cost: 40 }, { date: "b", value: 200, cost: 40 }]);
    expect(s.min).toBeLessThan(40);
    expect(s.max).toBeGreaterThan(200);
    expect(scaleOf([{ date: "a", value: 10, cost: 0 }, { date: "b", value: 100, cost: 0 }]).min).toBe(0);
  });

  it("copes with a flat line", () => {
    const s = scaleOf([{ date: "a", value: 50, cost: 50 }]);
    expect(s.max).toBeGreaterThan(s.min);
  });

  it("draws the highest value at the top and the lowest at the bottom, evenly across the width", () => {
    const d = linePath([0, 10], { min: 0, max: 10 }, 100, 50);
    expect(d).toBe("M 0.0 50.0 L 100.0 0.0");
  });

  it("draws a step line holding each value until the next", () => {
    const d = linePath([0, 10], { min: 0, max: 10 }, 100, 50, true);
    expect(d).toBe("M 0.0 50.0 L 100.0 50.0 L 100.0 0.0");
  });

  it("is empty for no values", () => {
    expect(linePath([], { min: 0, max: 1 }, 10, 10)).toBe("");
  });
});

describe("rangeStart and lensWindow", () => {
  const pts = ["2026-01-02", "2026-06-01", "2026-10-01", "2026-11-04"].map((date) => ({ date }));
  const marks = [{ date: "2026-01-02" }, { date: "2026-06-01" }, { date: "2026-10-20" }];

  it("counts a range back from the last day, and has no start for All", () => {
    expect(rangeStart("2026-11-04", "1M")).toBe("2026-10-05");
    expect(rangeStart("2026-11-04", "All")).toBeNull();
  });

  it("keeps the points and the trades inside the range", () => {
    const w = lensWindow(pts, marks, "3M");
    expect(w.points.map((p) => p.date)).toEqual(["2026-10-01", "2026-11-04"]);
    expect(w.markers.map((m) => m.date)).toEqual(["2026-10-20"]);
  });

  it("shows everything for All", () => {
    const w = lensWindow(pts, marks, "All");
    expect(w.points).toHaveLength(4);
    expect(w.markers).toHaveLength(3);
  });

  it("is empty for no points", () => {
    expect(lensWindow([], marks, "1M")).toEqual({ points: [], markers: [] });
  });

  it("offers the ranges a line is long enough for", () => {
    expect(offeredLensRanges(pts)).toEqual(["1M", "3M", "6M", "All"]);
    expect(offeredLensRanges([{ date: "2026-11-04" }])).toEqual(["All"]);
  });
});
