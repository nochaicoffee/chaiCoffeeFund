import { describe, expect, it } from "vitest";
import type { SplitDimensionView, SplitMemberView, SplitSliceView } from "./splitView";
import { layoutTreemap, withoutHolding, type Box } from "./treemapLayout";

const member = (key: string, fraction: number): SplitMemberView => ({ key, symbol: key, name: key, value: "", percent: "", fraction, valueInr: 0, costInr: 0, colorKey: "teal", gain: "", gainTone: "plain" });
const slice = (key: string, fraction: number, start: number, members: SplitMemberView[]): SplitSliceView => ({ key, label: key, colour: "teal", value: "", percent: "", fraction, start, gain: "", gainTone: "plain", members });

// Two slices: Equity (80%: A 75%, B 25% of it) and Gold (20%, one holding).
const grouped: SplitDimensionView = { key: "assetClass", label: "Asset class", slices: [slice("Equity", 0.8, 0, [member("A", 0.75), member("B", 0.25)]), slice("Gold", 0.2, 0.8, [member("G", 1)])] };
const flat: SplitDimensionView = { key: "holding", label: "Holding", slices: [slice("A", 0.6, 0, [member("A", 1)]), slice("B", 0.3, 0.6, [member("B", 1)]), slice("G", 0.1, 0.9, [member("G", 1)])] };
const W = 600;
const H = 400;
const area = (b: Box) => b.w * b.h;
const inside = (inner: Box, outer: Box) => inner.x >= outer.x - 0.01 && inner.y >= outer.y - 0.01 && inner.x + inner.w <= outer.x + outer.w + 0.01 && inner.y + inner.h <= outer.y + outer.h + 0.01;
const overlap = (a: Box, b: Box) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;

describe("layoutTreemap, flat (by holding)", () => {
  const l = layoutTreemap(flat, W, H);

  it("gives each holding a block with no groups, in the box, none on another", () => {
    expect(l.groups).toEqual([]);
    expect([...l.blocks.keys()].sort()).toEqual(["A", "B", "G"]);
    const boxes = [...l.blocks.values()];
    for (const b of boxes) expect(inside(b, { x: 0, y: 0, w: W, h: H })).toBe(true);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false);
  });

  it("sizes blocks by worth: a bigger holding gets a bigger block", () => {
    const [a, b, g] = ["A", "B", "G"].map((k) => area(l.blocks.get(k)!));
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(g);
    expect(a / b).toBeGreaterThan(1.5);
  });

  it("folds a holding away and lets the others grow", () => {
    const without = layoutTreemap(flat, W, H, "A");
    expect([...without.blocks.keys()].sort()).toEqual(["B", "G"]);
    expect(area(without.blocks.get("B")!)).toBeGreaterThan(area(l.blocks.get("B")!));
  });
});

describe("layoutTreemap, grouped", () => {
  const l = layoutTreemap(grouped, W, H);

  it("makes a tile for each slice and puts each holding's block inside its own slice's tile", () => {
    expect(l.groups.map((g) => g.key).sort()).toEqual(["Equity", "Gold"]);
    const [equity, gold] = ["Equity", "Gold"].map((k) => l.groups.find((g) => g.key === k)!);
    for (const k of ["A", "B"]) expect(inside(l.blocks.get(k)!, equity)).toBe(true);
    expect(inside(l.blocks.get("G")!, gold)).toBe(true);
    expect(overlap(equity, gold)).toBe(false);
  });

  it("sizes tiles by the slice's share, and leaves a band at the top of a tile big enough to name", () => {
    const equity = l.groups.find((g) => g.key === "Equity")!;
    const gold = l.groups.find((g) => g.key === "Gold")!;
    expect(area(equity)).toBeGreaterThan(area(gold) * 3);
    expect(equity.header).toBeGreaterThan(0);
    expect(l.blocks.get("A")!.y).toBeGreaterThanOrEqual(equity.y + equity.header);
  });

  it("leaves no band on a tile too small to name, and still lays its blocks out inside it", () => {
    const tiny = layoutTreemap({ ...grouped, slices: [grouped.slices[0], { ...grouped.slices[1], fraction: 0.01 }] }, W, 90);
    const gold = tiny.groups.find((g) => g.key === "Gold")!;
    expect(gold.header).toBe(0);
    expect(inside(tiny.blocks.get("G")!, gold)).toBe(true);
  });

  it("never gives a block a zero size, however thin its slice", () => {
    const thin = layoutTreemap({ ...grouped, slices: [grouped.slices[0], { ...grouped.slices[1], fraction: 0.001 }] }, W, H);
    for (const b of thin.blocks.values()) {
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
    }
  });
});

describe("withoutHolding", () => {
  const ms = [{ key: "A", valueInr: 600, costInr: 400 }, { key: "B", valueInr: 300, costInr: 350 }, { key: "C", valueInr: 100, costInr: 100 }];

  it("says what is left of everything, and what that has gained over what it cost", () => {
    expect(withoutHolding(ms, "A")).toEqual({ leftInr: 400, gainInr: -50 });
    expect(withoutHolding(ms, "B")).toEqual({ leftInr: 700, gainInr: 200 });
  });

  it("is nothing for a holding that isn't there, and leaves nothing of the only one", () => {
    expect(withoutHolding(ms, "Z")).toBeNull();
    expect(withoutHolding([ms[0]], "A")).toEqual({ leftInr: 0, gainInr: 0 });
  });
});
