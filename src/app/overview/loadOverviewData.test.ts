import { describe, expect, it, vi } from "vitest";

/**
 * Every tab the Overview reads must be asked for before any read is awaited: on a cold cache they then go to Sheets as one batch
 * (lib/sheets/batchedReads.ts). A read awaited first, as EPF's three tabs once were, puts the rest in a later round and a later request.
 */
const reads = vi.hoisted(() => ({ asked: [] as string[], release: [] as (() => void)[] }));

const READS = [
  "getCachedAccounts", "getCachedBalanceReviewsTab", "getCachedBalanceSnapshots", "getCachedCards", "getCachedEpfAccounts", "getCachedEpfEntries",
  "getCachedEpfRates", "getCachedFixedDeposits", "getCachedGoalContributions", "getCachedGoals", "getCachedIncomeEntries", "getCachedIncomeSources",
  "getCachedInstruments", "getCachedInvestmentTransactions", "getCachedLentLoans", "getCachedLentRepayments", "getCachedLoanInstallments",
  "getCachedLoanPrepayments", "getCachedLoans", "getCachedPolicies", "getCachedPolicyPayments", "getCachedStatements", "getCachedSubscriptionPayments",
  "getCachedSubscriptions",
] as const;

/** A read that is held open until the test lets every read finish. */
function heldRead(name: string, value: unknown) {
  return () => {
    reads.asked.push(name);
    return new Promise((resolve) => reads.release.push(() => resolve(value)));
  };
}

vi.mock("@/lib/sheets/cached", () =>
  Object.fromEntries(READS.map((name) => [name, heldRead(name, name === "getCachedBalanceReviewsTab" ? { records: [], skipped: { tab: "BalanceReviews", rows: [] } } : [])])),
);
vi.mock("@/lib/prices/series", () => ({ getPriceSeries: heldRead("getPriceSeries", new Map()) }));
vi.mock("@/lib/prices/rupeeBalances", () => ({
  rupeeBalances: async (accounts: unknown[], snapshots: unknown[]) => ({ accounts, snapshots, unpriced: [], rateProblem: null, usdInr: null }),
  unpricedForPage: () => undefined,
}));

const { loadOverviewData } = await import("./loadOverviewData");

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("loadOverviewData", () => {
  it("asks for every tab and the saved prices before waiting on any of them", async () => {
    const loading = loadOverviewData();
    await tick();
    // Nothing has been let through yet, so anything asked for so far was asked for up front.
    expect([...reads.asked].sort()).toEqual([...READS, "getPriceSeries"].sort());

    reads.release.forEach((release) => release());
    const data = await loading;
    expect(data.epf.failed).toBe(false);
    expect(data.pricesFailed).toBe(false);
  });
});
