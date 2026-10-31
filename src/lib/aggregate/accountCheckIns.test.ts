import { describe, expect, it } from "vitest";
import { checkInGrid } from "./accountCheckIns";
import type { Account, BalanceSnapshot } from "../sheets/types";

const account = (id: string, overrides: Partial<Account> = {}): Account => ({ id, name: id, bank: "Bank", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active", ...overrides });
const read = (accountId: string, date: string, balance = 1000): BalanceSnapshot => ({ id: `${accountId}-${date}`, accountId, date, balance });

const today = "2026-05-20";
const span = { from: "2026-01-01", to: today };

describe("checkInGrid", () => {
  const a = account("a");
  const snapshots = [read("a", "2026-01-10"), read("a", "2026-01-25", 1200), read("a", "2026-03-05")];
  const grid = checkInGrid([a], snapshots, span, today);

  it("has a column for each month of the period, up to the current one", () => {
    expect(grid.months).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]);
  });

  it("puts each reading in its month, a month with none missed, and the current month open until it's over", () => {
    expect(grid.rows[0].cells.map((c) => c.state)).toEqual(["read", "missed", "read", "missed", "open"]);
    expect(grid.rows[0].cells[0].readings.map((r) => r.date)).toEqual(["2026-01-10", "2026-01-25"]);
    expect(grid.readings).toBe(3);
    expect(grid.missed).toBe(2);
  });

  it("calls a month before the account existed none, so it can't have been missed", () => {
    const late = account("late", { startDate: "2026-03-10" });
    const g = checkInGrid([late], [read("late", "2026-03-10")], span, today);
    expect(g.rows[0].cells.map((c) => c.state)).toEqual(["none", "none", "read", "missed", "open"]);
  });

  it("calls the months after a closed account's last balance none", () => {
    const closed = account("closed", { status: "Inactive" });
    const g = checkInGrid([closed], [read("closed", "2026-01-12"), read("closed", "2026-02-20", 0)], span, today);
    expect(g.rows[0].cells.map((c) => c.state)).toEqual(["read", "read", "none", "none", "none"]);
    expect(g.missed).toBe(0);
  });

  it("finds the longest gap between readings, counting from the last reading to the period's end while the account is open", () => {
    // 2026-03-05 to 2026-05-20 is 76 days, longer than January's 15 and March's 39.
    expect(grid.longestGap).toEqual({ days: 76, account: a });
  });

  it("does not count the time after a closed account's last reading", () => {
    const closed = account("closed", { status: "Inactive" });
    const g = checkInGrid([closed], [read("closed", "2026-01-12"), read("closed", "2026-02-20", 0)], span, today);
    expect(g.longestGap.days).toBe(39);
  });

  it("names the account read most often", () => {
    const b = account("b");
    const g = checkInGrid([a, b], [...snapshots, read("b", "2026-02-01"), read("b", "2026-02-15"), read("b", "2026-02-22"), read("b", "2026-03-01")], span, today);
    expect(g.busiest.account).toBe(b);
    expect(g.busiest.readings).toBe(4);
  });

  it("shows only the last 12 months of a long period", () => {
    const g = checkInGrid([a], snapshots, { from: "2024-01-01", to: today }, today);
    expect(g.months).toHaveLength(12);
    expect(g.months.at(-1)).toBe("2026-05");
    expect(g.months[0]).toBe("2025-06");
  });

  it("is empty-handed with no accounts", () => {
    const g = checkInGrid([], [], span, today);
    expect(g.rows).toEqual([]);
    expect(g.readings).toBe(0);
    expect(g.longestGap).toEqual({ days: 0, account: null });
  });
});

describe("the longest gap for an account not read in the window", () => {
  it("counts the whole window, from where the account begins, when its last reading was before it", () => {
    const a = account("a");
    const g = checkInGrid([a], [read("a", "2025-12-10")], { from: "2026-03-01", to: today }, today);
    expect(g.readings).toBe(0);
    // From 2026-03-01 (the window's first day) to 2026-05-20.
    expect(g.longestGap).toEqual({ days: 80, account: a });
  });

  it("counts from when a late account began, not from the window's start", () => {
    const late = account("late", { startDate: "2026-04-20" });
    const g = checkInGrid([late], [], { from: "2026-03-01", to: today }, today);
    expect(g.longestGap).toEqual({ days: 30, account: late });
  });

  it("counts nothing for a closed account with no readings in the window", () => {
    const closed = account("closed", { status: "Inactive" });
    expect(checkInGrid([closed], [], { from: "2026-03-01", to: today }, today).longestGap.days).toBe(0);
  });
});
