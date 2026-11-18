import { beforeEach, describe, expect, it, vi } from "vitest";

// A read that never answers, to show what was asked for before anything came back.
const never = () => new Promise<never>(() => {});

const cached = vi.hoisted(() => {
  const names = [
    "getCachedAccounts",
    "getCachedBalanceSnapshots",
    "getCachedCards",
    "getCachedEpfAccounts",
    "getCachedEpfEntries",
    "getCachedEpfRates",
    "getCachedFixedDeposits",
    "getCachedGoalContributions",
    "getCachedGoals",
    "getCachedIncomeEntries",
    "getCachedIncomeSources",
    "getCachedInstruments",
    "getCachedInvestmentTransactions",
    "getCachedLentLoans",
    "getCachedLentRepayments",
    "getCachedLoanInstallments",
    "getCachedLoanPrepayments",
    "getCachedLoans",
    "getCachedPolicies",
    "getCachedPolicyPayments",
    "getCachedStatements",
    "getCachedSubscriptionPayments",
    "getCachedSubscriptions",
  ] as const;
  return Object.fromEntries(names.map((name) => [name, vi.fn()])) as Record<(typeof names)[number], ReturnType<typeof vi.fn>>;
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sheets/cached", () => cached);
vi.mock("@/lib/prices/series", () => ({ getPriceSeries: vi.fn() }));
vi.mock("@/lib/prices/rupeeBalances", () => ({ rupeeBalances: vi.fn(), unpricedForPage: vi.fn() }));

const { getPriceSeries } = await import("@/lib/prices/series");
const { loadOverviewData } = await import("./loadOverviewData");

describe("loadOverviewData", () => {
  beforeEach(() => {
    for (const read of Object.values(cached)) read.mockReset().mockImplementation(never);
    vi.mocked(getPriceSeries).mockReset().mockImplementation(never);
  });

  it("asks for every tab and the prices before any answer comes back, so a cold page reads them in one batch", async () => {
    void loadOverviewData();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const notAsked = Object.entries(cached)
      .filter(([, read]) => read.mock.calls.length === 0)
      .map(([name]) => name);
    expect(notAsked).toEqual([]);
    expect(getPriceSeries).toHaveBeenCalledTimes(1);
  });

  it("asks for an optional source's tabs together, not one after another", async () => {
    void loadOverviewData();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Each of these never answers, so a tab read only after another one's answer would not have been asked for.
    for (const group of [
      ["getCachedEpfAccounts", "getCachedEpfEntries", "getCachedEpfRates"],
      ["getCachedLentLoans", "getCachedLentRepayments"],
      ["getCachedGoals", "getCachedGoalContributions"],
      ["getCachedPolicies", "getCachedPolicyPayments"],
    ] as const) {
      for (const name of group) expect(cached[name], name).toHaveBeenCalledTimes(1);
    }
  });
});
