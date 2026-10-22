import { describe, expect, it } from "vitest";
import {
  accountColor,
  balanceOn,
  balanceTrend,
  changeSince,
  computeAccountBalances,
  dayBefore,
  highPoint,
  lastMonthsOfSpan,
  monthEnds,
  isBigDrop,
  isStale,
  periodSpan,
  sameDayBalance,
  sharesOfTotal,
  totalAccountBalance,
  totalOn,
  totalSeries,
  weeklyDates,
} from "./accounts";
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

describe("carrying a balance forward (decision 1)", () => {
  const accounts = [account({ id: "hdfc" }), account({ id: "kotak" })];
  // HDFC is read on the 30th, Kotak on the 2nd: never on the same day.
  const snapshots = [
    snapshot({ id: "h1", accountId: "hdfc", date: "2026-08-30", balance: 100_000 }),
    snapshot({ id: "k1", accountId: "kotak", date: "2026-09-02", balance: 40_000 }),
    snapshot({ id: "h2", accountId: "hdfc", date: "2026-09-30", balance: 120_000 }),
  ];

  it("counts each account at its latest balance on or before the date, and nothing before its first", () => {
    expect(totalOn(accounts, snapshots, "2026-08-15")).toBe(0);
    expect(totalOn(accounts, snapshots, "2026-08-30")).toBe(100_000);
    expect(totalOn(accounts, snapshots, "2026-09-02")).toBe(140_000);
    expect(totalOn(accounts, snapshots, "2026-09-29")).toBe(140_000);
    expect(totalOn(accounts, snapshots, "2026-09-30")).toBe(160_000);
  });

  it("moves the total by exactly the step on one account", () => {
    const before = totalOn(accounts, snapshots, "2026-10-15");
    const stepped = [...snapshots, snapshot({ id: "k2", accountId: "kotak", date: "2026-10-02", balance: 55_000 })];
    expect(totalOn(accounts, stepped, "2026-10-15") - before).toBe(55_000 - 40_000);
    expect(totalOn(accounts, stepped, "2026-10-01")).toBe(before);
  });

  it("lets the later row win when an account has two balances on one day", () => {
    const twice = [snapshot({ id: "a", date: "2026-09-01", balance: 10 }), snapshot({ id: "b", date: "2026-09-01", balance: 20 })];
    expect(balanceOn(twice, "acc-1", "2026-09-05")?.balance).toBe(20);
    expect(sameDayBalance(twice, "acc-1", "2026-09-01")?.id).toBe("b");
    expect(sameDayBalance(twice, "acc-1", "2026-09-02")).toBeNull();
  });

  it("is not thrown by the order of the rows", () => {
    expect(totalOn(accounts, [...snapshots].reverse(), "2026-09-30")).toBe(160_000);
  });

  it("drops to zero when an account is closed with a ₹0 balance, and keeps its history before", () => {
    const closed = [...snapshots, snapshot({ id: "k0", accountId: "kotak", date: "2026-10-05", balance: 0 })];
    expect(totalOn(accounts, closed, "2026-10-04")).toBe(160_000);
    expect(totalOn(accounts, closed, "2026-10-05")).toBe(120_000);
  });

  it("gives the change since a day: today's total minus what was carried on it", () => {
    // HDFC carried 100,000 on Aug 31 and holds 120,000; Kotak opened on Sep 2 at 40,000 and still holds it.
    expect(changeSince(accounts, snapshots, "2026-08-31", "2026-10-21")).toBe(20_000);
  });

  it("counts an account opened after the day from its first balance, not as money coming in", () => {
    // Both were first read after Jul 31: HDFC 100,000 → 120,000 and Kotak 40,000 → 40,000.
    expect(changeSince(accounts, snapshots, "2026-07-31", "2026-10-21")).toBe(20_000);
    // Kotak is carried from Aug 31 at nothing, so only its first balance in the span is the baseline.
    expect(changeSince([accounts[1]], snapshots, "2026-08-31", "2026-10-21")).toBe(0);
  });

  it("builds the line from carried totals, so a day only one account was read isn't undercounted", () => {
    expect(totalSeries(accounts, snapshots, ["2026-09-02", "2026-09-15"]).map((p) => p.total)).toEqual([140_000, 140_000]);
    expect(balanceTrend(accounts, snapshots)).toEqual([
      { date: "2026-08-30", total: 100_000 },
      { date: "2026-09-02", total: 140_000 },
      { date: "2026-09-30", total: 160_000 },
    ]);
  });

  it("finds the high point and each account's share, biggest first, shares adding up to one", () => {
    expect(highPoint(totalSeries(accounts, snapshots, ["2026-08-30", "2026-09-02", "2026-09-30"]))).toEqual({ date: "2026-09-30", total: 160_000 });
    expect(highPoint([])).toBeNull();
    const shares = sharesOfTotal(accounts, snapshots, "2026-09-30");
    expect(shares.map((s) => s.account.id)).toEqual(["hdfc", "kotak"]);
    expect(shares.reduce((t, s) => t + s.share, 0)).toBeCloseTo(1, 10);
    expect(shares[0].share).toBeCloseTo(0.75, 10);
  });
});

describe("stale (decision 3)", () => {
  const a = account({ id: "sbi" });
  it("is more than 30 days since the latest balance, not 30", () => {
    expect(isStale(a, [snapshot({ accountId: "sbi", date: "2026-09-21" })], "2026-10-21")).toBe(false);
    expect(isStale(a, [snapshot({ accountId: "sbi", date: "2026-09-20" })], "2026-10-21")).toBe(true);
  });
  it("is never stale with no balance yet, or when closed", () => {
    expect(isStale(a, [], "2026-10-21")).toBe(false);
    expect(isStale(account({ id: "sbi", status: "Inactive" }), [snapshot({ accountId: "sbi", date: "2026-01-01" })], "2026-10-21")).toBe(false);
  });
});

describe("saving a balance (decision 8)", () => {
  it("asks to check a drop of more than a fifth, never exactly a fifth, and never a rise", () => {
    expect(isBigDrop(100_000, 79_999)).toBe(true);
    expect(isBigDrop(100_000, 80_000)).toBe(false);
    expect(isBigDrop(100_000, 150_000)).toBe(false);
    expect(isBigDrop(null, 0)).toBe(false);
    expect(isBigDrop(0, 0)).toBe(false);
  });
});

describe("colour and dates", () => {
  it("shows an account's own colour, else its purpose's", () => {
    expect(accountColor({ color: "Ruby", purpose: "Spending" })).toBe("Ruby");
    expect(accountColor({ purpose: "Emergency-Fund" })).toBe("Teal");
  });
  it("steps a week at a time and always ends on the last day", () => {
    expect(weeklyDates("2026-10-01", "2026-10-20")).toEqual(["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-20"]);
    expect(weeklyDates("2026-10-01", "2026-10-15")).toEqual(["2026-10-01", "2026-10-08", "2026-10-15"]);
    expect(weeklyDates("2026-10-21", "2026-10-01")).toEqual([]);
  });
  it("steps back a day across a month and a year", () => {
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2026-01-01")).toBe("2025-12-31");
  });
  it("spans a period: a year up to today, a range to its last day, all time from the first balance", () => {
    expect(periodSpan({ kind: "year", year: 2026 }, "2026-10-21", null)).toEqual({ from: "2026-01-01", to: "2026-10-21" });
    expect(periodSpan({ kind: "year", year: 2025 }, "2026-10-21", null)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(periodSpan({ kind: "range", from: "2026-02", to: "2026-02" }, "2026-10-21", null)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodSpan({ kind: "all" }, "2026-10-21", "2024-03-09")).toEqual({ from: "2024-03-09", to: "2026-10-21" });
  });
});

describe("same-day balances while editing one", () => {
  const rows = [snapshot({ id: "a", date: "2026-09-01", balance: 10 }), snapshot({ id: "b", date: "2026-09-05", balance: 20 })];
  it("ignores the balance being edited, so it doesn't clash with itself", () => {
    expect(sameDayBalance(rows, "acc-1", "2026-09-05")?.id).toBe("b");
    expect(sameDayBalance(rows, "acc-1", "2026-09-05", "b")).toBeNull();
    expect(sameDayBalance(rows, "acc-1", "2026-09-01", "b")?.id).toBe("a");
  });
});

describe("charts over months", () => {
  it("cuts a long span to its last 24 months and leaves a short one alone", () => {
    expect(lastMonthsOfSpan({ from: "2021-03-09", to: "2026-10-22" })).toEqual({ from: "2024-11-01", to: "2026-10-22" });
    expect(lastMonthsOfSpan({ from: "2026-01-01", to: "2026-10-22" })).toEqual({ from: "2026-01-01", to: "2026-10-22" });
  });

  const accounts = [account({ id: "a" }), account({ id: "b" })];
  const snaps = [
    snapshot({ id: "1", accountId: "a", date: "2026-01-15", balance: 100 }),
    snapshot({ id: "2", accountId: "a", date: "2026-02-10", balance: 150 }),
    snapshot({ id: "3", accountId: "b", date: "2026-02-20", balance: 400 }),
  ];
  it("gives each month's end total, and a change that leaves out an account's opening", () => {
    const m = monthEnds(accounts, snaps, { from: "2026-01-01", to: "2026-03-10" });
    expect(m.map((x) => [x.month, x.total])).toEqual([["2026-01", 100], ["2026-02", 550], ["2026-03", 550]]);
    // January: a opens at 100 (not a change). February: a +50, and b opens at 400 (not a change).
    expect(m.map((x) => x.change)).toEqual([0, 50, 0]);
    expect(m[2].date).toBe("2026-03-10");
    expect(m[1].parts.map((p) => p.accountId)).toEqual(["a", "b"]);
  });
});
