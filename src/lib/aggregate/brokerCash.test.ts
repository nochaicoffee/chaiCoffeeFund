import { describe, expect, it } from "vitest";
import type { Account } from "../sheets/types";
import { inRupees, type RupeeSnapshot } from "./accountCurrency";
import { cashAfterTrade, cashByBroker, idleShare, totalCash } from "./brokerCash";

const base = { startDate: "2023-01-01", status: "Active" as const, purpose: "Investment" as const };
const vested: Account = { ...base, id: "vested", name: "Vested cash", bank: "Vested", accountType: "Brokerage", currency: "USD" };
const zerodha: Account = { ...base, id: "zerodha", name: "Zerodha cash", bank: "Zerodha", accountType: "Brokerage" };
const hdfc: Account = { ...base, id: "hdfc", name: "HDFC", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending" };
const snap = (accountId: string, date: string, balance: number) => ({ id: `${accountId}${date}`, accountId, date, balance });

const accounts = [hdfc, vested, zerodha];
const snaps = [snap("hdfc", "2026-10-01", 50000), snap("vested", "2026-10-19", 3000), snap("vested", "2026-09-19", 2790), snap("zerodha", "2026-10-18", 100000)];
const counted = inRupees(accounts, snaps, 90.15);
const cash = cashByBroker(counted.accounts, counted.snapshots as RupeeSnapshot[], "2026-10-31");

describe("cashByBroker", () => {
  it("lists only Brokerage accounts, the biggest in rupees first, each with its own-currency balance", () => {
    expect(cash.map((c) => c.account.id)).toEqual(["vested", "zerodha"]);
    expect(cash[0]).toMatchObject({ balance: 3000, date: "2026-10-19" });
    expect(cash[0].rupees).toBeCloseTo(270450, 2);
    expect(cash[1]).toMatchObject({ balance: 100000, rupees: 100000 });
  });

  it("uses the latest balance on or before the day", () => {
    expect(cashByBroker(counted.accounts, counted.snapshots, "2026-10-01")[0]).toMatchObject({ account: { id: "vested" }, balance: 2790 });
  });

  it("leaves out an account with no balance and a closed one", () => {
    expect(cashByBroker([vested], [], "2026-10-31")).toEqual([]);
    expect(cashByBroker([{ ...zerodha, status: "Inactive" }], counted.snapshots, "2026-10-31")).toEqual([]);
  });

  it("totals the cash in rupees", () => {
    expect(totalCash(cash)).toBeCloseTo(370450, 2);
  });
});

describe("idleShare", () => {
  it("is cash over holdings plus cash: ₹3,70,450 against ₹55,47,897 is 6.26%", () => {
    expect(idleShare(370450, 5547897.43)).toBeCloseTo(0.0626, 4);
  });
  it("is 0 with no cash, and 0 rather than NaN with nothing at all", () => {
    expect(idleShare(0, 100)).toBe(0);
    expect(idleShare(0, 0)).toBe(0);
  });
  it("is 1 when there are only cash and no holdings", () => {
    expect(idleShare(100, 0)).toBe(1);
  });
});

describe("cashAfterTrade", () => {
  it("a $2,525.60 buy from $3,000 leaves $474.40", () => {
    const r = cashAfterTrade(3000, { tradeType: "Buy", total: 2525.6, currency: "USD" }, "USD");
    expect(r.after).toBeCloseTo(474.4, 2);
    expect(r.short).toBe(false);
    expect(r.shortBy).toBe(0);
  });
  it("a $3,157 buy leaves −$157 and warns", () => {
    const r = cashAfterTrade(3000, { tradeType: "Buy", total: 3157, currency: "USD" }, "USD");
    expect(r.after).toBe(-157);
    expect(r).toMatchObject({ short: true, shortBy: 157 });
  });
  it("a sell adds its proceeds", () => {
    expect(cashAfterTrade(100000, { tradeType: "Sell", total: 25000, currency: "INR" }, "INR")).toEqual({ after: 125000, short: false, shortBy: 0, mismatch: false });
  });
  it("spending exactly all of it is not short", () => {
    expect(cashAfterTrade(500, { tradeType: "Buy", total: 500, currency: "INR" }, "INR").short).toBe(false);
  });
  it("a US trade against a rupee account is a mismatch and leaves the balance alone", () => {
    expect(cashAfterTrade(100000, { tradeType: "Buy", total: 2525.6, currency: "USD" }, "INR")).toEqual({ after: 100000, short: false, shortBy: 0, mismatch: true });
  });
});
