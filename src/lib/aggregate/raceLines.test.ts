import { describe, expect, it } from "vitest";
import { DEPOSIT_RATE, raceLines } from "./raceLines";
import type { PricePoint } from "../prices/history";

const dates = ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-06"];
const closes = new Map<string, PricePoint[]>([
  ["^NSEI", [{ date: "2025-01-02", close: 100 }, { date: "2025-01-03", close: 110 }]],
  ["^GSPC", [{ date: "2025-01-01", close: 1000 }, { date: "2025-01-03", close: 1100 }]],
  ["USDINR", [{ date: "2025-01-01", close: 80 }, { date: "2025-01-03", close: 90 }]],
]);
const lines = raceLines({ dates, youIndex: [1, 1.01, 1.02, 1.3], closes });
const line = (key: string) => lines.find((l) => l.key === key)!.values;

describe("raceLines", () => {
  it("gives the portfolio's index as it is, one value a day", () => {
    expect(line("you")).toEqual([1, 1.01, 1.02, 1.3]);
  });

  it("takes each day's latest close on or before it, and none before the first close", () => {
    expect(line("nifty")).toEqual([null, 100, 110, 110]);
  });

  it("works the S&P in rupees from its close and that day's rate, each from on or before the day", () => {
    expect(line("sp500")).toEqual([80_000, 80_000, 99_000, 99_000]);
  });

  it("grows the deposit at its yearly rate from the first day", () => {
    const d = raceLines({ dates: ["2025-01-01", "2026-01-01"], youIndex: [1, 1], closes: new Map() }).find((l) => l.key === "deposit")!.values;
    expect(d[0]).toBe(1);
    expect(d[1]!).toBeCloseTo(Math.pow(1 + DEPOSIT_RATE, 1), 4); // exactly a year on
  });

  it("leaves a gap where an index's latest close is more than a week old, instead of drawing it flat", () => {
    const d = ["2025-01-01", "2025-01-08", "2025-01-09", "2025-02-01"];
    const stopped = raceLines({ dates: d, youIndex: [1, 1, 1, 1], closes: new Map([["^NSEI", [{ date: "2025-01-01", close: 100 }]], ["^GSPC", [{ date: "2025-01-01", close: 10 }]], ["USDINR", [{ date: "2025-01-01", close: 80 }]]]) });
    expect(stopped.find((l) => l.key === "nifty")!.values).toEqual([100, 100, null, null]); // a week old is still a close, eight days isn't
    expect(stopped.find((l) => l.key === "sp500")!.values).toEqual([800, 800, null, null]);
  });

  it("is empty with no days, and leaves a line empty when its closes are missing", () => {
    expect(raceLines({ dates: [], youIndex: [], closes })).toEqual([]);
    const bare = raceLines({ dates, youIndex: [1, 1, 1, 1], closes: new Map() });
    expect(bare.find((l) => l.key === "nifty")!.values.every((v) => v === null)).toBe(true);
    expect(bare.find((l) => l.key === "sp500")!.values.every((v) => v === null)).toBe(true);
  });
});
