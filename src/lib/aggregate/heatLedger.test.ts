import { describe, expect, it } from "vitest";
import type { HeatCell, HeatRow } from "./cardSpend";
import { MIN_BAR, barWidth, latestDataColumn, ledgerYears, maxAmount } from "./heatLedger";

const cell = (month: string, amount: number | null, state: HeatCell["state"] = amount === null ? "no-data" : "data", level: HeatCell["level"] = 3): HeatCell => ({ month, amount, state, level });

describe("barWidth", () => {
  it("is proportional to the largest month, and the largest fills the track", () => {
    expect(barWidth(50, 100)).toBe(50);
    expect(barWidth(100, 100)).toBe(100);
  });
  it("never draws a month thinner than the minimum, so its shade still shows", () => {
    expect(barWidth(1, 1000)).toBe(MIN_BAR);
  });
  it("gives a ₹0 month, or one with no scale to compare to, the minimum bar rather than none", () => {
    expect(barWidth(0, 100)).toBe(MIN_BAR);
    expect(barWidth(50, 0)).toBe(MIN_BAR);
  });
});

describe("maxAmount", () => {
  it("looks only at months with a figure", () => {
    expect(maxAmount([cell("2026-01", 10), cell("2026-02", null), cell("2026-03", 40), cell("2026-04", null, "upcoming")])).toBe(40);
  });
  it("is 0 with none", () => {
    expect(maxAmount([cell("2026-01", null)])).toBe(0);
  });
});

describe("ledgerYears", () => {
  const rows: HeatRow[] = [
    { year: 2025, cells: [cell("2025-11", 200), cell("2025-12", 100)] },
    { year: 2026, cells: [cell("2026-01", 50), cell("2026-02", null), cell("2026-03", null, "upcoming"), cell("2026-04", null, "outside")] },
  ];
  const years = ledgerYears(rows);

  it("puts the newest year first", () => {
    expect(years.map((y) => y.year)).toEqual([2026, 2025]);
  });
  it("leaves out the months a range doesn't cover, and keeps the rest in their places", () => {
    expect(years[0].rows.map((r) => r.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
  it("scales every bar to the largest month across all the years, as the shades do", () => {
    expect(years[1].rows.map((r) => r.width)).toEqual([100, 50]);
    expect(years[0].rows[0].width).toBe(25);
  });
  it("gives a month without a figure no bar", () => {
    expect(years[0].rows.slice(1).map((r) => r.width)).toEqual([0, 0]);
  });
  it("still draws a ₹0 month, which has data, so it isn't read as a month without", () => {
    const [year] = ledgerYears([{ year: 2026, cells: [cell("2026-01", 0, "data", 1), cell("2026-02", 80)] }]);
    expect(year.rows[0].width).toBe(MIN_BAR);
  });
});

describe("latestDataColumn", () => {
  const row = (...states: HeatCell["state"][]): HeatCell[] => states.map((s, i) => cell(`2026-${String(i + 1).padStart(2, "0")}`, s === "data" ? 10 : null, s));
  it("is the last column where any row has a figure", () => {
    expect(latestDataColumn([row("data", "no-data", "no-data"), row("no-data", "data", "upcoming")])).toBe(1);
  });
  it("is null when no row has one", () => {
    expect(latestDataColumn([row("no-data", "upcoming")])).toBeNull();
    expect(latestDataColumn([])).toBeNull();
  });
});
