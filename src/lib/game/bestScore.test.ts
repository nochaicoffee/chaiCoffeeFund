import { describe, expect, it } from "vitest";
import { BEST_KEY, loadBest, saveBest } from "./bestScore";

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
};
const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };

describe("best score", () => {
  it("is kept and read back", () => {
    const store = memory();
    saveBest(42, store);
    expect(store.data[BEST_KEY]).toBe("42");
    expect(loadBest(store)).toBe(42);
  });
  it("never lowers it: another tab may have got further, and saving the same or less changes nothing", () => {
    const store = memory({ [BEST_KEY]: "20" });
    saveBest(5, store);
    expect(store.data[BEST_KEY]).toBe("20");
    saveBest(20, store);
    expect(store.data[BEST_KEY]).toBe("20");
    saveBest(31.9, store);
    expect(store.data[BEST_KEY]).toBe("31");
    const empty = memory();
    saveBest(0, empty);
    expect(empty.data[BEST_KEY]).toBeUndefined();
  });
  it("starts at zero, and ignores anything that isn't a good number", () => {
    expect(loadBest(memory())).toBe(0);
    for (const bad of ["", "abc", "-5", "NaN", "Infinity"]) expect(loadBest(memory({ [BEST_KEY]: bad }))).toBe(0);
  });
  it("lets the game play on when storage throws or isn't there", () => {
    expect(loadBest(broken)).toBe(0);
    expect(() => saveBest(9, broken)).not.toThrow();
    expect(loadBest(null)).toBe(0);
    expect(() => saveBest(9, null)).not.toThrow();
  });
});
