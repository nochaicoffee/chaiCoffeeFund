import { describe, expect, it } from "vitest";
import { averageEpfMonth, averageMonthlyAdd, futureView } from "./futureView";
import { overviewModel, type OverviewData } from "./model";
import type { Account, EpfEntry, FixedDeposit, InvestmentTransaction } from "@/lib/sheets/types";

const TODAY = "2026-11-07";
const trade = (id: string, date: string, type: "Buy" | "Sell", total: number, source: InvestmentTransaction["source"] = "Market"): InvestmentTransaction => ({ id, tradeDate: date, symbol: "A", market: "IND", currency: "INR", tradeType: type, source, quantity: 1, price: total, total, assetType: "Equity", broker: "B" });
const base: OverviewData = {
  accounts: [{ id: "a", name: "A", bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active" } as Account], balanceSnapshots: [{ id: "s", accountId: "a", date: "2026-11-01", balance: 100000 }], unpriced: undefined, cards: [], statements: [], subscriptions: [], subscriptionPayments: [], loans: [], loanInstallments: [], loanPrepayments: [],
  trades: [], instruments: [], closes: new Map(), pricesFailed: false, fixedDeposits: [], incomeEntries: [], incomeSources: [], epf: { accounts: [], entries: [], rates: [], failed: false }, lent: { loans: [], repayments: [], failed: false }, goals: { goals: [], contributions: [], failed: false }, insurance: { policies: [], payments: [], failed: false },
};
const m = (over: Partial<OverviewData>) => overviewModel({ ...base, ...over }, TODAY);

describe("averageMonthlyAdd", () => {
  it("is buys less sales over twelve months, over twelve; an RSU vest and its cover don't count", () => {
    const trades = [trade("1", "2026-03-01", "Buy", 120000), trade("2", "2026-05-01", "Buy", 60000, "ESPP"), trade("3", "2026-06-01", "Sell", 36000), trade("4", "2026-07-01", "Buy", 900000, "RSU"), trade("5", "2026-07-01", "Sell", 400000, "RSU"), trade("6", "2025-06-01", "Buy", 999999)];
    expect(averageMonthlyAdd(m({ trades }))).toBe(Math.round((120000 + 60000 - 36000) / 12));
  });
  it("is never below nothing, and null with no trades of his own", () => {
    expect(averageMonthlyAdd(m({ trades: [trade("1", "2026-03-01", "Sell", 50000)] }))).toBe(0);
    expect(averageMonthlyAdd(m({}))).toBeNull();
    expect(averageMonthlyAdd(m({ trades: [trade("1", "2026-03-01", "Buy", 5, "RSU")] }))).toBeNull();
  });
});

describe("averageEpfMonth", () => {
  const entry = (wage: string, employee: number, employer: number, kind: EpfEntry["kind"] = "Contribution"): EpfEntry => ({ id: wage + kind, epfAccountId: "e", kind, date: `${wage}-20`, wageMonth: wage, employee, employer, pension: 0, source: "Typed" } as EpfEntry);
  it("averages his last three contribution months, both shares, and ignores interest", () => {
    const entries = [entry("2026-06", 100, 100), entry("2026-07", 200, 100), entry("2026-08", 200, 200), entry("2026-09", 300, 300), entry("2026-03", 0, 0, "Interest")];
    expect(averageEpfMonth(m({ epf: { accounts: [], entries, rates: [], failed: false } }))).toBe(Math.round((300 + 400 + 600) / 3));
    expect(averageEpfMonth(m({}))).toBeNull();
  });
});

describe("futureView", () => {
  it("starts from today's figures, defaults from the records, and says where each came from", () => {
    const fd: FixedDeposit = { id: "f", name: "FD", principalAmount: 300000, interestRate: 8, compoundingType: "Cumulative", startDate: "2026-01-01", maturityDate: "2027-01-01", status: "Active" };
    const fd2: FixedDeposit = { ...fd, id: "g", principalAmount: 100000, interestRate: 6 };
    const v = futureView(m({ fixedDeposits: [fd, fd2] }));
    expect(v.start.bank).toBe(100000);
    expect(v.defaults.depositPct).toBe(7.5); // 8% on 3L and 6% on 1L
    expect(v.notes.find((n) => n.key === "depositPct")!.assumed).toBe(false);
    expect(v.notes.find((n) => n.key === "epfPct")).toMatchObject({ assumed: true });
    expect(v.defaults.epfPct).toBe(8.25);
  });
  it("leaves out a loan with nothing left", () => {
    expect(futureView(m({})).start.loanBalances).toEqual([]);
  });
});
