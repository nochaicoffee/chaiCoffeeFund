import { describe, expect, it } from "vitest";

/**
 * Loading each entity module creates its repository, which checks the columns
 * against the row schema (assertColumnsMatchSchema) and throws on a mismatch.
 * So a schema field added without its column fails here, not by every row of
 * that tab quietly dropping out of the app.
 */
describe("every repository's columns match its row schema", () => {
  const modules = [
    "./accounts",
    "./balanceSnapshots",
    "./cards",
    "./fixedDeposits",
    "./incomeEntries",
    "./incomeSources",
    "./investmentTransactions",
    "./loanInstallments",
    "./loans",
    "./statements",
    "./subscriptionPayments",
    "./subscriptions",
  ];
  it.each(modules)("%s", async (path) => {
    await expect(import(path)).resolves.toBeDefined();
  });
});
