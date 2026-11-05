import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, BalanceSnapshot } from "@/lib/sheets/types";

const getUsdInr = vi.fn();
vi.mock("./usdInr", () => ({ getUsdInr: () => getUsdInr() }));

import { rupeeBalances, unpricedForPage } from "./rupeeBalances";

const hdfc: Account = { id: "hdfc", name: "HDFC", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active" };
const vested: Account = { id: "vested", name: "Vested cash", bank: "Vested", accountType: "Brokerage", purpose: "Investment", startDate: "2023-01-01", status: "Active", currency: "USD" };
const snaps: BalanceSnapshot[] = [
  { id: "1", accountId: "hdfc", date: "2026-10-01", balance: 1000 },
  { id: "2", accountId: "vested", date: "2026-09-01", balance: 2500 },
  { id: "3", accountId: "vested", date: "2026-10-19", balance: 3000 },
];

beforeEach(() => getUsdInr.mockReset());

describe("rupeeBalances", () => {
  it("doesn't ask for a rate when no account is in dollars", async () => {
    const result = await rupeeBalances([hdfc], snaps.slice(0, 1));
    expect(getUsdInr).not.toHaveBeenCalled();
    expect(result.rateProblem).toBeNull();
    expect(result.accounts).toEqual([hdfc]);
  });

  it("counts a dollar account in rupees when the rate is had", async () => {
    getUsdInr.mockResolvedValue({ ok: true, rate: 90, date: "2026-11-04" });
    const result = await rupeeBalances([hdfc, vested], snaps);
    expect(result.rateProblem).toBeNull();
    expect(result.snapshots.find((s) => s.id === "3")?.balance).toBe(270000);
    expect(unpricedForPage(result)).toBeUndefined();
  });

  it("leaves the dollar account out, and says why, when the rate can't be had", async () => {
    getUsdInr.mockResolvedValue({ ok: false, reason: "the rate service answered 503" });
    const result = await rupeeBalances([hdfc, vested], snaps);
    expect(result.accounts.map((a) => a.id)).toEqual(["hdfc"]);
    expect(result.snapshots.map((s) => s.accountId)).toEqual(["hdfc"]);
    expect(result.rateProblem).toBe("the rate service answered 503");
    const page = unpricedForPage(result);
    expect(page?.reason).toBe("the rate service answered 503");
    expect(page?.accounts).toHaveLength(1);
    expect(page?.accounts[0]).toMatchObject({ id: "vested", name: "Vested cash", dollars: 3000, account: vested });
    expect(page?.accounts[0].snapshots.map((x) => x.balance)).toEqual([2500, 3000]);
  });
});
