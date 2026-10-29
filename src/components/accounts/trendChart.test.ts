import { describe, expect, it } from "vitest";
import { blur, nearestIndex, normalise, smoothPath, steppedPath } from "./trendChart";

describe("normalise", () => {
  it("scales to the line's own range, 0 at the lowest and 1 at the highest", () => {
    expect(normalise([100, 300, 200])).toEqual([0, 1, 0.5]);
  });
  it("puts a flat line in the middle, and handles none", () => {
    expect(normalise([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
    expect(normalise([])).toEqual([]);
  });
});

describe("blur", () => {
  it("keeps the length and a flat line flat", () => {
    expect(blur([2, 2, 2, 2], 2)).toEqual([2, 2, 2, 2]);
    expect(blur([0, 10, 0, 10, 0], 1)).toHaveLength(5);
  });
  it("softens a step without leaving the range of the values", () => {
    const stepped = [0, 0, 0, 10, 10, 10];
    const soft = blur(stepped, 2);
    expect(Math.min(...soft)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...soft)).toBeLessThanOrEqual(10);
    expect(soft[2]).toBeGreaterThan(0);
    expect(soft[3]).toBeLessThan(10);
  });
});

describe("smoothPath", () => {
  const norm = [0, 0, 1, 1, 0.5];

  it("passes through every point, evenly spaced across the width", () => {
    const { xs, ys } = smoothPath(norm, 400, 100, 10, 10);
    expect(xs).toEqual([0, 100, 200, 300, 400]);
    // 1 is padTop from the top, 0 is padBottom from the bottom.
    expect(ys).toEqual([90, 90, 10, 10, 50]);
  });

  it("starts at the first point and ends at the last", () => {
    const { d } = smoothPath(norm, 400, 100, 10, 10);
    expect(d.startsWith("M 0.0 90.0")).toBe(true);
    expect(d.endsWith("400.0 50.0")).toBe(true);
  });

  it("never overshoots: no control point leaves the band between a point and its neighbour", () => {
    const { d, ys } = smoothPath(norm, 400, 100, 10, 10);
    const numbers = [...d.matchAll(/C ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)/g)];
    expect(numbers).toHaveLength(4);
    numbers.forEach((m, i) => {
      const lo = Math.min(ys[i], ys[i + 1]);
      const hi = Math.max(ys[i], ys[i + 1]);
      expect(Number(m[2])).toBeGreaterThanOrEqual(lo - 0.05);
      expect(Number(m[2])).toBeLessThanOrEqual(hi + 0.05);
      expect(Number(m[4])).toBeGreaterThanOrEqual(lo - 0.05);
      expect(Number(m[4])).toBeLessThanOrEqual(hi + 0.05);
    });
  });

  it("draws a flat run as a flat curve", () => {
    const { d } = smoothPath([0.5, 0.5, 0.5], 200, 100, 0, 0);
    expect(d).toBe("M 0.0 50.0 C 33.3 50.0 66.7 50.0 100.0 50.0 C 133.3 50.0 166.7 50.0 200.0 50.0");
  });

  it("copes with no points and one point", () => {
    expect(smoothPath([], 100, 100, 0, 0).d).toBe("");
    expect(smoothPath([1], 100, 100, 5, 5).d).toBe("M 0 5");
  });
});

describe("steppedPath", () => {
  it("goes flat, then straight up at each change", () => {
    expect(steppedPath([0, 1], 100, 100, 0)).toBe("M 0 100.0 L 100.0 100.0 L 100.0 0.0");
  });
});

describe("nearestIndex", () => {
  it("picks the point nearest a position, clamped to the line", () => {
    expect(nearestIndex(0, 5)).toBe(0);
    expect(nearestIndex(1, 5)).toBe(4);
    expect(nearestIndex(0.49, 5)).toBe(2);
    expect(nearestIndex(-3, 5)).toBe(0);
    expect(nearestIndex(9, 5)).toBe(4);
    expect(nearestIndex(0.5, 1)).toBe(0);
  });
});
