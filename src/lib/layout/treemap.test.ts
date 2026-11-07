import { describe, expect, it } from "vitest";
import { squarify } from "./treemap";

const items = [
  { key: "chatgpt", value: 1999 },
  { key: "cult", value: 1500 },
  { key: "netflix", value: 649 },
  { key: "m365", value: 517 },
  { key: "icloud", value: 219 },
  { key: "swiggy", value: 183 },
  { key: "youtube", value: 149 },
  { key: "prime", value: 125 },
  { key: "spotify", value: 119 },
  { key: "times", value: 100 },
];

describe("squarify", () => {
  const rects = squarify(items, 704, 520);

  it("gives every item an area in proportion to its value, filling the box exactly", () => {
    const total = items.reduce((t, it) => t + it.value, 0);
    for (const r of rects) expect(r.w * r.h).toBeCloseTo((r.value / total) * 704 * 520, 6);
    expect(rects.reduce((t, r) => t + r.w * r.h, 0)).toBeCloseTo(704 * 520, 6);
  });

  it("keeps every rectangle inside the box, with none overlapping", () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(704 + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(520 + 1e-6);
    }
    for (const a of rects) for (const b of rects) {
      if (a === b) continue;
      const overlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      expect(overlap).toBeLessThan(1e-6);
    }
  });

  it("puts the biggest first, and leaves out nothing but zero values", () => {
    expect(rects[0].key).toBe("chatgpt");
    expect(squarify([...items, { key: "free", value: 0 }], 704, 520)).toHaveLength(items.length);
    expect(squarify([], 704, 520)).toEqual([]);
  });
});
