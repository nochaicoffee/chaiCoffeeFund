import { describe, expect, it } from "vitest";
import { balanceTrend, computeAccountBalances, totalAccountBalance } from "./accounts";
import type { Account, BalanceSnapshot } from "../sheets/types";

const account = (overrides: Partial<Account> = {}): Account => ({
  id: "acc-1",
  name: "Test Account",
  bank: "Test Bank",
  accountType: "Savings",
  purpose: "Spending",
  startDate: "2026-01-01",
  status: "Active",
  ...overrides,
});

const snapshot = (overrides: Partial<BalanceSnapshot> = {}): BalanceSnapshot => ({
  id: "snap-1",
  accountId: "acc-1",
  date: "2026-08-01",
  balance: 1000,
  ...overrides,
});

describe("computeAccountBalances", () => {
  it("uses the most recent snapshot as the current balance", () => {
    const accounts = [account()];
    const snapshots = [
      snapshot({ id: "s1", date: "2026-06-01", balance: 800 }),
      snapshot({ id: "s2", date: "2026-08-01", balance: 1000 }),
      snapshot({ id: "s3", date: "2026-07-01", balance: 900 }),
    ];
    const [result] = computeAccountBalances(accounts, snapshots);
    expect(result.latestBalance).toBe(1000);
    expect(result.latestDate).toBe("2026-08-01");
    expect(result.previousBalance).toBe(900);
    expect(result.monthOverMonthChange).toBe(100);
  });

  it("returns nulls for an account with no snapshots yet", () => {
    const [result] = computeAccountBalances([account()], []);
    expect(result.latestBalance).toBeNull();
    expect(result.monthOverMonthChange).toBeNull();
  });
});

describe("totalAccountBalance", () => {
  it("sums latest balances across active accounts only", () => {
    const accounts = [
      account({ id: "acc-1", status: "Active" }),
      account({ id: "acc-2", status: "Inactive" }),
    ];
    const snapshots = [
      snapshot({ accountId: "acc-1", balance: 1000 }),
      snapshot({ accountId: "acc-2", balance: 5000 }),
    ];
    expect(totalAccountBalance(accounts, snapshots)).toBe(1000);
  });
});

describe("balanceTrend", () => {
  it("sums balances across accounts sharing the same snapshot date, sorted ascending", () => {
    const accounts = [account({ id: "acc-1" }), account({ id: "acc-2" })];
    const snapshots = [
      snapshot({ accountId: "acc-1", date: "2026-08-01", balance: 1000 }),
      snapshot({ accountId: "acc-2", date: "2026-08-01", balance: 500 }),
      snapshot({ accountId: "acc-1", date: "2026-07-01", balance: 900 }),
      snapshot({ accountId: "acc-2", date: "2026-07-01", balance: 400 }),
    ];
    expect(balanceTrend(accounts, snapshots)).toEqual([
      { date: "2026-07-01", total: 1300 },
      { date: "2026-08-01", total: 1500 },
    ]);
  });

  it("excludes inactive accounts", () => {
    const accounts = [account({ id: "acc-1", status: "Active" }), account({ id: "acc-2", status: "Inactive" })];
    const snapshots = [
      snapshot({ accountId: "acc-1", date: "2026-08-01", balance: 1000 }),
      snapshot({ accountId: "acc-2", date: "2026-08-01", balance: 99999 }),
    ];
    expect(balanceTrend(accounts, snapshots)).toEqual([{ date: "2026-08-01", total: 1000 }]);
  });
});
