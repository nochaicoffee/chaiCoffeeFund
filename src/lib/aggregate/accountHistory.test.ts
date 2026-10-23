import { describe, expect, it } from "vitest";
import { historyEntries, historySummary, listEntries, matchesStatus, monthGroups, paginate, scopeEntries, statusCounts } from "./accountHistory";
import type { Account, BalanceSnapshot } from "../sheets/types";

const acct = (o: Partial<Account> & { id: string }): Account => ({ name: o.id, bank: "Bank", accountType: "Savings", purpose: "Spending", startDate: "2025-01-01", status: "Active", ...o });
const snap = (accountId: string, date: string, balance: number, id = `${accountId}-${date}`): BalanceSnapshot => ({ id, accountId, date, balance });

const hdfc = acct({ id: "hdfc", name: "HDFC Salary", bank: "HDFC Bank", last4: "4821" });
const yes = acct({ id: "yes", name: "YES Old", bank: "YES Bank", status: "Inactive", purpose: "Emergency-Fund" });
const accounts = [hdfc, yes];
const snaps = [
  snap("hdfc", "2025-12-31", 100_000),
  snap("hdfc", "2026-01-31", 120_000),
  snap("hdfc", "2026-02-28", 90_000),
  snap("hdfc", "2026-02-28", 95_000, "dup"), // a later row for the same day
  snap("hdfc", "2026-03-31", 95_000),
  snap("yes", "2026-02-10", 5_000),
  snap("yes", "2026-03-04", 0),
];
const today = "2026-04-10";
const all = historyEntries(accounts, snaps);
const period = { kind: "year", year: 2026 } as const;

describe("historyEntries", () => {
  it("says which balances a bank statement gave, and no others", () => {
    const entries = historyEntries([hdfc], [{ ...snap("hdfc", "2026-01-31", 1), source: "Statement" }, { ...snap("hdfc", "2026-02-28", 2), source: "Manual" }, snap("hdfc", "2026-03-31", 3)]);
    expect(entries.map((e) => e.fromStatement)).toEqual([true, false, false]);
  });
  it("measures each balance against the one before it, even from before the period", () => {
    const jan = all.find((e) => e.id === "hdfc-2026-01-31")!;
    expect(jan).toMatchObject({ previous: 100_000, delta: 20_000, gapDays: 31, first: false });
  });
  it("marks only an account's very first balance as first, and a closed account's last ₹0 as closing", () => {
    expect(all.filter((e) => e.first).map((e) => e.id).sort()).toEqual(["hdfc-2025-12-31", "yes-2026-02-10"]);
    expect(all.filter((e) => e.closing).map((e) => e.id)).toEqual(["yes-2026-03-04"]);
  });
  it("keeps the Sheet's order for two balances on one day, with a gap of 0 days", () => {
    const second = all.find((e) => e.id === "dup")!;
    expect(second).toMatchObject({ previous: 90_000, delta: 5_000, gapDays: 0 });
  });
  it("leaves out balances of an account that no longer exists", () => {
    expect(historyEntries([hdfc], [...snaps, snap("gone", "2026-01-01", 1)]).some((e) => e.account.id === "gone")).toBe(false);
  });
});

describe("scoping and status", () => {
  it("keeps the period by each balance's own date", () => {
    const scoped = scopeEntries(all, { period }, today);
    expect(scoped.some((e) => e.date === "2025-12-31")).toBe(false);
    expect(scoped).toHaveLength(6);
  });
  it("filters by account and purpose", () => {
    expect(scopeEntries(all, { period, accountId: "yes" }, today)).toHaveLength(2);
    expect(scopeEntries(all, { period, purpose: "Emergency-Fund" }, today).every((e) => e.account.id === "yes")).toBe(true);
  });
  it("searches names, banks and last 4, and amounts as digits in the balance or the change", () => {
    const ids = (search: string) => scopeEntries(all, { period, search }, today).map((e) => e.id);
    expect(ids("hdfc").length).toBe(4);
    expect(ids("yes bank")).toHaveLength(2);
    expect(ids("4821").length).toBe(4);
    expect(ids("₹1,20,000")).toEqual(["hdfc-2026-01-31"]);
    expect(ids("20000")).toEqual(["hdfc-2026-01-31"]);
    // A prefix of the amount, not any digits inside it.
    expect(ids("0000")).toEqual([]);
    expect(ids("zzz")).toEqual([]);
  });
  it("counts rises, falls and first or closing over the scope", () => {
    const counts = statusCounts(scopeEntries(all, { period }, today));
    // hdfc: Jan +20k, Feb −30k, Feb dup +5k, Mar 0; yes: Feb first, Mar closing (−5k).
    expect(counts).toEqual({ all: 6, rises: 2, falls: 2, first: 2 });
    expect(matchesStatus(all.find((e) => e.id === "hdfc-2026-03-31")!, "rises")).toBe(false);
  });
});

describe("listing", () => {
  const scoped = scopeEntries(all, { period }, today);
  it("sorts newest and oldest first by date, then name", () => {
    expect(listEntries([...scoped], "all", "newest")[0].id).toBe("hdfc-2026-03-31");
    expect(listEntries([...scoped], "all", "oldest")[0].id).toBe("hdfc-2026-01-31");
  });
  it("sorts the biggest move first in either direction, with first balances last", () => {
    const list = listEntries([...scoped], "all", "biggest");
    expect(list.map((e) => e.delta)).toEqual([-30_000, 20_000, -5_000, 5_000, 0, null]);
    expect(list.at(-1)!.delta).toBeNull();
  });
  it("groups by month in the list's order, each with its net, which leaves out first balances", () => {
    const groups = monthGroups(listEntries([...scoped], "all", "newest"), "newest");
    expect(groups.map((g) => g.key)).toEqual(["2026-03", "2026-02", "2026-01"]);
    expect(groups.map((g) => g.net)).toEqual([-5_000, -25_000, 20_000]);
  });
  it("has one ungrouped list for biggest, and none when empty", () => {
    expect(monthGroups(listEntries([...scoped], "all", "biggest"), "biggest")).toHaveLength(1);
    expect(monthGroups([], "newest")).toEqual([]);
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 30 }, (_, i) => i);
  it("pages and clamps to a real page", () => {
    expect(paginate(list, 2, 12)).toMatchObject({ page: 2, pages: 3, from: 13, to: 24, total: 30 });
    expect(paginate(list, 99, 12)).toMatchObject({ page: 3, from: 25, to: 30 });
    expect(paginate(list, -4, 12).page).toBe(1);
  });
  it("is one empty page with nothing in it", () => {
    expect(paginate([], 1)).toMatchObject({ page: 1, pages: 1, from: 0, to: 0, total: 0 });
  });
});

describe("historySummary", () => {
  const scoped = scopeEntries(all, { period }, today);
  const s = historySummary(scoped, accounts, snaps, today);
  it("counts, finds the biggest move either way, and the average gap", () => {
    expect(s).toMatchObject({ recorded: 6, rises: 2, falls: 2, other: 2 });
    expect(s.biggest?.id).toBe("hdfc-2026-02-28");
    // gaps: 31, 28, 0, 31, 22 days (yes: Feb 10 to Mar 4)
    expect(s.averageGap).toBe(Math.round((31 + 28 + 0 + 31 + 22) / 5));
  });
  it("names stale accounts as of today, whatever the period", () => {
    expect(s.stale.map((a) => a.id)).toEqual([]);
    const later = historySummary(scoped, accounts, snaps, "2026-06-30");
    expect(later.stale.map((a) => a.id)).toEqual(["hdfc"]);
  });
  it("has no biggest or average with nothing in the scope", () => {
    expect(historySummary([], accounts, snaps, today)).toMatchObject({ recorded: 0, biggest: null, averageGap: null });
  });
});
