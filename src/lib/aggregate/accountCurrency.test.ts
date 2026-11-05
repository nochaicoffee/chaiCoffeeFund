import { describe, expect, it } from "vitest";
import type { Account, BalanceSnapshot } from "../sheets/types";
import { balanceOn, balancesOn, totalOn } from "./accounts";
import { inRupees, isDollarAccount, needsRate } from "./accountCurrency";

const rupee = (id: string): Account => ({ id, name: id, bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active" });
const dollar = (id: string): Account => ({ id, name: id, bank: "Vested", accountType: "Brokerage", purpose: "Investment", startDate: "2023-01-01", status: "Active", currency: "USD" });
const snap = (accountId: string, date: string, balance: number): BalanceSnapshot => ({ id: `${accountId}-${date}`, accountId, date, balance });

const RATE = 94.64;
const accounts = [rupee("hdfc"), dollar("vested")];
const snaps = [snap("hdfc", "2026-10-01", 100000), snap("vested", "2026-09-19", 2790), snap("vested", "2026-10-19", 3000)];

describe("inRupees", () => {
  it("counts a dollar balance at dollars times today's rate, keeping the dollars", () => {
    const { snapshots } = inRupees(accounts, snaps, RATE);
    const latest = snapshots.find((s) => s.id === "vested-2026-10-19");
    expect(latest?.balance).toBeCloseTo(3000 * RATE, 2);
    expect(latest?.native).toBe(3000);
  });

  it("leaves a rupee account exactly as it was", () => {
    const { snapshots } = inRupees(accounts, snaps, RATE);
    const hdfc = snapshots.find((s) => s.accountId === "hdfc");
    expect(hdfc).toBe(snaps[0]);
    expect(hdfc && "native" in hdfc).toBe(false);
  });

  it("a step of $100 moves the total by exactly 100 times the rate", () => {
    const before = inRupees(accounts, snaps, RATE).snapshots;
    const after = inRupees(accounts, [...snaps, snap("vested", "2026-10-20", 3100)], RATE).snapshots;
    expect(totalOn(accounts, after, "2026-10-20") - totalOn(accounts, before, "2026-10-20")).toBeCloseTo(100 * RATE, 2);
  });

  it("values a past balance at today's rate, so a history carries no rate", () => {
    const { snapshots } = inRupees(accounts, snaps, RATE);
    expect(balanceOn(snapshots, "vested", "2026-09-30")?.balance).toBeCloseTo(2790 * RATE, 2);
  });

  it("changes between two balances by the dollar change times the rate, and a rate move alone changes nothing", () => {
    const a = inRupees(accounts, snaps, RATE).snapshots.filter((s) => s.accountId === "vested");
    expect(a[1].balance - a[0].balance).toBeCloseTo((3000 - 2790) * RATE, 2);
    const flat = [snap("vested", "2026-09-19", 3000), snap("vested", "2026-10-19", 3000)];
    for (const rate of [RATE, 80, 100]) {
      const [x, y] = inRupees(accounts, flat, rate).snapshots;
      expect(y.balance - x.balance).toBe(0);
    }
  });

  it("keeps the carry-forward: an account counts at its latest balance on or before the day", () => {
    const { accounts: kept, snapshots } = inRupees(accounts, snaps, RATE);
    const on = balancesOn(kept, snapshots, "2026-10-10");
    expect(on.map((h) => h.account.id)).toEqual(["hdfc", "vested"]);
    expect(on[1].balance).toBeCloseTo(2790 * RATE, 2);
  });

  it("returns the same accounts and snapshots when none is in dollars, without needing a rate", () => {
    const plain = [rupee("a"), rupee("b")];
    const plainSnaps = [snap("a", "2026-10-01", 5), snap("b", "2026-10-01", 7)];
    const result = inRupees(plain, plainSnaps, null);
    expect(result.accounts).toBe(plain);
    expect(result.snapshots).toBe(plainSnaps);
    expect(result.unpriced).toEqual([]);
  });

  describe("with no rate", () => {
    it("leaves a dollar account out of the totals and hands it back in dollars", () => {
      const result = inRupees(accounts, snaps, null);
      expect(result.accounts.map((a) => a.id)).toEqual(["hdfc"]);
      expect(result.snapshots.every((s) => s.accountId === "hdfc")).toBe(true);
      expect(totalOn(result.accounts, result.snapshots, "2026-10-31")).toBe(100000);
      expect(result.unpriced).toHaveLength(1);
      expect(result.unpriced[0].account.id).toBe("vested");
      expect(result.unpriced[0].snapshots.map((s) => s.balance)).toEqual([2790, 3000]);
    });

    it.each([[0], [-90], [Number.NaN], [Number.POSITIVE_INFINITY]])("treats a rate of %s as no rate", (bad) => {
      const result = inRupees(accounts, snaps, bad);
      expect(result.snapshots.some((s) => s.accountId === "vested")).toBe(false);
      expect(result.unpriced).toHaveLength(1);
    });

    it("never counts it as zero or at an invented rate", () => {
      const result = inRupees(accounts, snaps, null);
      expect(result.snapshots.some((s) => s.accountId === "vested")).toBe(false);
    });
  });
});

describe("isDollarAccount and needsRate", () => {
  it("only a USD account is a dollar account; a row with no currency is rupees", () => {
    expect(isDollarAccount(dollar("v"))).toBe(true);
    expect(isDollarAccount(rupee("r"))).toBe(false);
    expect(isDollarAccount({ currency: "INR" })).toBe(false);
  });
  it("asks for a rate only when a dollar account exists", () => {
    expect(needsRate([rupee("a")])).toBe(false);
    expect(needsRate(accounts)).toBe(true);
  });
});
