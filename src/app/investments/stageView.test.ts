import { describe, expect, it } from "vitest";
import { asOfReading, axisDate, axisTicks, dateTickIndexes, goBackIndex, inRange, lensWindow, linePath, gappedPath, goBackMark, moneyBars, racePercent, raceScale, rebased, spreadLabels, offeredGoBack, offeredLensRanges, offeredRanges, rangeStart, readingAt, scaleOf, tickLabel, type StagePoint } from "./stageView";

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

describe("going back to a day", () => {
  const withFlow = (n: number): StagePoint[] => Array.from({ length: n }, (_, i) => ({ date: `d${i}`, value: 1000 + i * 10, cost: 900, flow: i === 5 ? 200 : 0 }));

  it("offers only the days that fall after his first trade, and always Today", () => {
    expect(offeredGoBack(withFlow(100))).toEqual(["now", "1m"]);
    expect(offeredGoBack(withFlow(400))).toEqual(["now", "1m", "6m", "1y"]);
    expect(offeredGoBack(withFlow(2000))).toEqual(["now", "1m", "6m", "1y", "2y"]);
    expect(offeredGoBack(withFlow(1))).toEqual(["now"]);
  });

  it("lands on the point that many days before the last, and on the last for Today", () => {
    const s = withFlow(400);
    expect(goBackIndex(s, "now")).toBe(399);
    expect(goBackIndex(s, "1m")).toBe(369);
    expect(goBackIndex(s, "1y")).toBe(34);
    expect(goBackIndex(withFlow(10), "1y")).toBe(0);
  });

  it("splits what happened since into the money added and what the market did", () => {
    const s = withFlow(10); // worth 1000 on d0 to 1090 on d9; 200 added on d5
    const r = asOfReading(s, 2)!;
    expect(r).toMatchObject({ date: "d2", value: 1020, cost: 900, gain: 120, addedSince: 200 });
    expect(r.marketSince).toBe(1090 - 1020 - 200);
    expect(r.addedSince + r.marketSince).toBe(1090 - 1020); // the two always make up the whole change
  });

  it("counts nothing added when the day is the last, or the flow is missing", () => {
    expect(asOfReading(withFlow(10), 9)).toMatchObject({ addedSince: 0, marketSince: 0 });
    expect(asOfReading([{ date: "a", value: 5, cost: 5 }, { date: "b", value: 8, cost: 5 }], 0)).toMatchObject({ addedSince: 0, marketSince: 3 });
    expect(asOfReading([], 0)).toBeNull();
  });

  it("doesn't count the day itself: money added that day is in that day's worth already", () => {
    expect(asOfReading(withFlow(10), 5)!.addedSince).toBe(0);
  });
});

describe("moneyBars", () => {
  it("sums each run's buys, as a fraction of the biggest run", () => {
    const pts: StagePoint[] = Array.from({ length: 8 }, (_, i) => ({ date: `d${i}`, value: 0, cost: 0, flow: [100, 0, 0, 0, 50, 50, -300, 0][i] }));
    expect(moneyBars(pts, 4)).toEqual([1, 0, 1, 0]); // runs of 2: 100, 0, 100 (50+50), 0 (a sale of 300 is not money added)
  });

  it("keeps a bar under its days when the range has fewer days than bars", () => {
    const pts: StagePoint[] = Array.from({ length: 31 }, (_, i) => ({ date: `d${i}`, value: 0, cost: 0, flow: i === 0 || i === 30 ? 100 : 0 }));
    const bars = moneyBars(pts); // 38 slices for 31 days: the first day under the first bar, the last day under the last
    expect(bars).toHaveLength(38);
    expect(bars[0]).toBe(1);
    expect(bars[37]).toBe(1);
    expect(bars.filter((b) => b > 0)).toHaveLength(2);
  });

  it("is all zero when nothing was added, and empty for no points", () => {
    expect(moneyBars([{ date: "a", value: 1, cost: 1 }], 3)).toEqual([0, 0, 0]);
    expect(moneyBars([])).toEqual([]);
  });
});

describe("axes", () => {
  it("hangs gridlines on round numbers inside the range", () => {
    expect(axisTicks(3_200_000, 6_300_000)).toEqual([4_000_000, 5_000_000, 6_000_000]);
    expect(axisTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(axisTicks(5, 5)).toEqual([]);
  });

  it("prints a tick as the design does", () => {
    expect(tickLabel(6_000_000)).toBe("60L");
    expect(tickLabel(2_500_000)).toBe("25L");
    expect(tickLabel(15_000_000)).toBe("1.5Cr");
    expect(tickLabel(45_000)).toBe("45000");
  });

  it("spreads dates evenly from the first point to the last", () => {
    expect(dateTickIndexes(101, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(dateTickIndexes(1)).toEqual([0]);
    expect(dateTickIndexes(3, 5)).toEqual([0, 1, 2]);
  });
});

describe("axisDate", () => {
  it("says the day and month on a short chart, the month and year on a long one", () => {
    expect(axisDate("2026-06-14", 60)).toBe("14 Jun");
    expect(axisDate("2026-06-14", 100)).toBe("14 Jun");
    expect(axisDate("2021-09-01", 365)).toBe("Sep 21");
  });
});

describe("goBackMark", () => {
  const long = Array.from({ length: 800 }, (_, i) => ({ date: `d${i}`, value: 1, cost: 1 }));

  it("finds the day among the points a range shows, which are the tail of the series", () => {
    expect(goBackMark(long, 366, "1m")).toBe(366 - 1 - 30);
    expect(goBackMark(long, 366, "1y")).toBe(0);
    expect(goBackMark(long, 800, "1y")).toBe(800 - 1 - 365);
  });

  it("is null for Today, and for a day before the range starts", () => {
    expect(goBackMark(long, 366, "now")).toBeNull();
    expect(goBackMark(long, 91, "1y")).toBeNull();
  });
});

describe("the Race", () => {
  it("rebases a line to 100 on its first day, keeping gaps", () => {
    const r = rebased([200, 220, null, 180])!;
    expect(r[0]).toBe(100);
    expect(r[1]).toBeCloseTo(110, 9);
    expect(r[2]).toBeNull();
    expect(r[3]).toBeCloseTo(90, 9);
  });

  it("leaves out a line that has nothing on its first day, or nothing but zero", () => {
    expect(rebased([null, 5, 6])).toBeNull();
    expect(rebased([0, 5])).toBeNull();
    expect(rebased([])).toBeNull();
  });

  it("scales over every line with room, and copes with nothing or a flat line", () => {
    const s = raceScale([[100, 130], [100, null, 90]]);
    expect(s.min).toBeLessThan(90);
    expect(s.max).toBeGreaterThan(130);
    expect(raceScale([[null]])).toEqual({ min: 0, max: 1 });
    const flat = raceScale([[100, 100]]);
    expect(flat.max).toBeGreaterThan(flat.min);
  });

  it("says a level as a percent against 100", () => {
    expect(racePercent(128.4)).toBe("+28%");
    expect(racePercent(94.6, 1)).toBe("−5.4%");
    expect(racePercent(100)).toBe("0%");
    expect(racePercent(100.2)).toBe("0%"); // no sign on a change that rounds to nothing
  });

  it("keeps end labels apart, in the order given, and on the chart", () => {
    const out = spreadLabels([0.5, 0.2, 0.52, 0.99, 1], 0.08);
    expect(out).toHaveLength(5);
    const sorted = [...out].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(0.08 - 1e-9);
    expect(Math.max(...out)).toBeLessThanOrEqual(1 + 1e-9);
    expect(out[1]).toBeCloseTo(0.2, 9); // the lone one stays where it was
    expect(out[0]).toBeLessThan(out[2]); // the order is kept
    expect(spreadLabels([])).toEqual([]);
  });
});

describe("gappedPath", () => {
  it("breaks the line where a day has no value, and joins the days that have one", () => {
    const d = gappedPath([0, 10, null, 5, 10], { min: 0, max: 10 }, 40, 10);
    expect(d).toBe("M 0.0 10.0 L 10.0 0.0 M 30.0 5.0 L 40.0 0.0");
  });

  it("is empty when no day has a value", () => {
    expect(gappedPath([null, null], { min: 0, max: 1 }, 10, 10)).toBe("");
  });
});
