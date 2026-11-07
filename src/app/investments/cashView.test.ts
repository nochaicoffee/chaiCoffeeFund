import { describe, expect, it } from "vitest";
import { inRupees, type RupeeSnapshot } from "@/lib/aggregate/accountCurrency";
import { cashByBroker } from "@/lib/aggregate/brokerCash";
import type { Account, BalanceSnapshot } from "@/lib/sheets/types";
import { cashView, unpricedCash } from "./cashView";

const base = { startDate: "2023-01-01", status: "Active" as const, purpose: "Investment" as const };
const vested: Account = { ...base, id: "vested", name: "Vested cash", bank: "Vested", accountType: "Brokerage", currency: "USD" };
const zerodha: Account = { ...base, id: "zerodha", name: "Zerodha cash", bank: "Zerodha", accountType: "Brokerage" };
const snap = (accountId: string, date: string, balance: number, source?: "Statement"): BalanceSnapshot => ({ id: `${accountId}${date}`, accountId, date, balance, source });

const counted = inRupees([vested, zerodha], [snap("vested", "2026-10-19", 3000), snap("zerodha", "2026-09-12", 100000, "Statement")], 90);
const cash = cashByBroker(counted.accounts, counted.snapshots as RupeeSnapshot[], "2026-10-31");
const view = cashView({ cash, holdingsInr: 5_000_000, today: "2026-10-31", usdInr: 90 })!;

describe("cashView", () => {
  it("says what is idle against the holdings: the idle share of cash over holdings plus cash", () => {
    // 3,000 dollars at 90 is 2,70,000, plus 1,00,000: 3,70,000 of 53,70,000.
    expect(view.total).toBe("₹3.70L");
    expect(view.idle).toBeCloseTo(370_000 / 5_370_000, 9);
    expect(view.idleText).toBe("6.9%");
    expect(view.everything).toBe("₹53.70L");
    expect(view.accountsLine).toBe("2 accounts · $3,000.00 and ₹1,00,000");
    expect(view.brokers).toBe(2);
  });

  it("gives each account its own money, the rupees only for a dollar one, and where and when it was read", () => {
    const [us, inr] = view.tiles;
    expect(us).toMatchObject({ name: "Vested cash", currency: "USD", balance: "$3,000.00", inr: "₹2,70,000", rateNote: "at ₹90 a dollar", source: "Typed in", age: "12 days ago" });
    expect(inr).toMatchObject({ currency: "INR", balance: "₹1,00,000", rateNote: "already in rupees", source: "From a statement" });
    expect(inr.inr).toBeUndefined();
  });

  it("tags a balance over 30 days old as stale and not a fresher one", () => {
    const [us, inr] = view.tiles;
    expect(us.stale).toBeUndefined();
    expect(inr.stale).toBe("49 days old");
  });

  it("points the greeting at a card listing each account and the holdings, with the same total", () => {
    expect(view.greeting.total).toBe(view.total);
    expect(view.greeting.rows.map((r) => r.key)).toEqual(["vested", "zerodha", "holdings"]);
    expect(view.greeting.rows[0].amount).toBe("$3,000.00 · ₹2,70,000");
  });

  it("has nothing to show with no cash, and says so for a dollar account left out with no rate", () => {
    expect(cashView({ cash: [], holdingsInr: 1, today: "2026-10-31", usdInr: null })).toBeNull();
    const noRate = cashView({ cash: [], holdingsInr: 1, today: "2026-10-31", usdInr: null, unpriced: [{ name: "IBKR", dollars: 1490 }], reason: "the rate service is down" })!;
    expect(noRate.tiles).toEqual([]);
    expect(noRate.unpriced).toEqual([{ name: "IBKR", dollars: "$1,490.00" }]);
    expect(noRate.reason).toBe("the rate service is down");
  });
});

describe("unpricedCash", () => {
  it("names only open broker accounts, not a closed one or a bank account", () => {
    const closed: Account = { ...vested, id: "old", name: "Old broker", status: "Inactive" };
    const bank: Account = { ...base, id: "bank", name: "Dollar bank", bank: "HDFC", accountType: "Savings", currency: "USD" };
    const list = [vested, closed, bank].map((account) => ({ account, name: account.name, dollars: 100 }));
    expect(unpricedCash(list)).toEqual([{ name: "Vested cash", dollars: 100 }]);
  });
});
