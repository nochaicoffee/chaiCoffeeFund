import { describe, expect, it } from "vitest";
import { edgeIndex, popoverPlacement, stepIndex, typeaheadIndex, type ListboxItem } from "./listbox";

const items = (labels: string[], disabled: number[] = []): ListboxItem[] => labels.map((label, i) => ({ label, disabled: disabled.includes(i) }));

const banks = items(["HDFC Bank", "ICICI Bank", "Axis Bank", "SBI Card", "AU Small Finance Bank", "American Express", "Other"]);

describe("stepIndex", () => {
  it("moves one option at a time and stops at the ends instead of wrapping", () => {
    const list = items(["a", "b", "c"]);
    expect(stepIndex(list, 0, 1)).toBe(1);
    expect(stepIndex(list, 2, 1)).toBe(2);
    expect(stepIndex(list, 0, -1)).toBe(0);
  });

  it("skips disabled options", () => {
    const list = items(["a", "b", "c", "d"], [1, 2]);
    expect(stepIndex(list, 0, 1)).toBe(3);
    expect(stepIndex(list, 3, -1)).toBe(0);
  });

  it("starts from the first option going down, or the last going up, when nothing is highlighted", () => {
    const list = items(["a", "b", "c"], [0]);
    expect(stepIndex(list, -1, 1)).toBe(1);
    expect(stepIndex(list, -1, -1)).toBe(2);
  });

  it("jumps a page at a time, clamped to the ends", () => {
    const days = items(Array.from({ length: 31 }, (_, i) => String(i + 1)));
    expect(stepIndex(days, 3, 8)).toBe(11);
    expect(stepIndex(days, 27, 8)).toBe(30);
    expect(stepIndex(days, 4, -8)).toBe(0);
  });

  it("has nowhere to go when every option is disabled", () => {
    expect(stepIndex(items(["a", "b"], [0, 1]), -1, 1)).toBe(-1);
    expect(stepIndex([], -1, 1)).toBe(-1);
  });
});

describe("edgeIndex", () => {
  it("finds the first and last enabled options for Home and End", () => {
    const list = items(["a", "b", "c", "d"], [0, 3]);
    expect(edgeIndex(list, "first")).toBe(1);
    expect(edgeIndex(list, "last")).toBe(2);
    expect(edgeIndex(items(["a"], [0]), "first")).toBe(-1);
  });
});

describe("typeaheadIndex", () => {
  it("finds the first label starting with the letter, ignoring case", () => {
    expect(typeaheadIndex(banks, -1, "s")).toBe(3);
    expect(typeaheadIndex(banks, -1, "I")).toBe(1);
  });

  it("steps through the matches when the same letter is pressed again, wrapping round", () => {
    expect(typeaheadIndex(banks, -1, "a")).toBe(2);
    expect(typeaheadIndex(banks, 2, "a")).toBe(4);
    expect(typeaheadIndex(banks, 4, "aa")).toBe(5);
    expect(typeaheadIndex(banks, 5, "aaa")).toBe(2);
  });

  it("keeps the current option while a longer search still matches it", () => {
    expect(typeaheadIndex(banks, 2, "ax")).toBe(2);
    expect(typeaheadIndex(banks, 2, "am")).toBe(5);
    expect(typeaheadIndex(banks, 4, "au s")).toBe(4);
  });

  it("finds a statement day by its number", () => {
    const ordinals = items(["1st", "2nd", "3rd", "4th", ...Array.from({ length: 27 }, (_, i) => `${i + 5}th`)]);
    expect(typeaheadIndex(ordinals, 0, "2")).toBe(1);
    expect(typeaheadIndex(ordinals, 1, "25")).toBe(24);
  });

  it("skips disabled options and finds nothing for a search no label starts with", () => {
    expect(typeaheadIndex(items(["Axis", "Amex"], [0]), -1, "a")).toBe(1);
    expect(typeaheadIndex(banks, 0, "zz")).toBe(-1);
    expect(typeaheadIndex(banks, 0, "")).toBe(-1);
  });
});

describe("popoverPlacement", () => {
  const viewport = { width: 1280, height: 800 };
  const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, right: left + width, bottom: top + height });

  it("opens under the trigger, left edges lined up, 8px below it", () => {
    const place = popoverPlacement(rect(100, 100, 140, 40), { width: 220, height: 200 }, viewport);
    expect(place).toEqual({ top: 148, left: 100, side: "bottom", maxHeight: 800 - 140 - 8 - 16 });
  });

  it("lines up with the trigger's right edge when it would run off the window and align is end", () => {
    const place = popoverPlacement(rect(1150, 20, 110, 40), { width: 240, height: 200 }, viewport, "end");
    expect(place.left).toBe(1260 - 240);
  });

  it("slides left just enough to keep 16px from the edge when align is start", () => {
    const place = popoverPlacement(rect(1150, 20, 110, 40), { width: 240, height: 200 }, viewport);
    expect(place.left).toBe(1280 - 16 - 240);
  });

  it("never goes closer than 16px to the left edge, even when the trigger's right edge is near it", () => {
    const phone = { width: 375, height: 700 };
    // Right-aligned it would start at 280 − 316 = −36.
    expect(popoverPlacement(rect(150, 100, 130, 44), { width: 316, height: 300 }, phone, "end").left).toBe(16);
    expect(popoverPlacement(rect(0, 100, 60, 44), { width: 200, height: 100 }, phone, "end").left).toBe(16);
    // It fits where it is, so it stays lined up with the trigger.
    expect(popoverPlacement(rect(20, 100, 130, 44), { width: 316, height: 300 }, phone, "end").left).toBe(20);
  });

  it("opens above only when it doesn't fit below and there's more room above", () => {
    const place = popoverPlacement(rect(100, 600, 200, 40), { width: 200, height: 300 }, viewport);
    expect(place.side).toBe("top");
    expect(place.top).toBe(600 - 8 - 300);
    expect(place.maxHeight).toBe(600 - 8 - 16);
  });

  it("stays below, and shortens, when below still has more room than above", () => {
    const place = popoverPlacement(rect(100, 300, 200, 40), { width: 200, height: 600 }, viewport);
    expect(place.side).toBe("bottom");
    expect(place.maxHeight).toBe(800 - 340 - 8 - 16);
  });
});
