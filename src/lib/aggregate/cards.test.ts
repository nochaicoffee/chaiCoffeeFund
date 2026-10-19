import { describe, expect, it } from "vitest";
import { cardOutstandingBalance, computeCardSummaries, statementVariance, totalCardOutstanding } from "./cards";
import type { Card, Statement } from "../sheets/types";

const card = (overrides: Partial<Card> = {}): Card => ({
  id: "card-1",
  name: "Test Card",
  alias: "TC",
  issuer: "Other",
  cardType: "Cashback",
  creditLimit: 100000,
  statementDay: 15,
  dueDayBuffer: 20,
  status: "Active",
  ...overrides,
});

const statement = (overrides: Partial<Statement> = {}): Statement => ({
  id: "stmt-1",
  cardId: "card-1",
  statementDate: "2026-08-15",
  dueDate: "2026-09-04",
  totalAmountDue: 10000,
  minimumAmountDue: 500,
  status: "Pending",
  ...overrides,
});

describe("cardOutstandingBalance", () => {
  it("sums unpaid pending statements only", () => {
    const statements = [
      statement({ id: "s1", status: "Pending", totalAmountDue: 10000, amountPaid: 4000 }),
      statement({ id: "s2", status: "Paid", totalAmountDue: 5000, amountPaid: 5000 }),
    ];
    expect(cardOutstandingBalance("card-1", statements)).toBe(6000);
  });

  it("never lets an overpaid pending bill go below zero", () => {
    expect(cardOutstandingBalance("card-1", [statement({ totalAmountDue: 1000, amountPaid: 1500 })])).toBe(0);
  });

  it("ignores statements for other cards", () => {
    const statements = [statement({ cardId: "other-card", totalAmountDue: 10000 })];
    expect(cardOutstandingBalance("card-1", statements)).toBe(0);
  });
});

describe("statementVariance", () => {
  it("flags an overpayment as positive, matching the real Statements data pattern", () => {
    const result = statementVariance(statement({ totalAmountDue: 16098, amountPaid: 32196 }));
    expect(result.variance).toBe(16098);
  });

  it("flags an underpayment as negative", () => {
    const result = statementVariance(statement({ totalAmountDue: 10000, amountPaid: 500 }));
    expect(result.variance).toBe(-9500);
  });
});

describe("computeCardSummaries", () => {
  it("computes utilization as outstanding ÷ credit limit", () => {
    const [summary] = computeCardSummaries(
      [card({ creditLimit: 100000 })],
      [statement({ totalAmountDue: 25000, amountPaid: 0 })],
      "2026-08-25",
    );
    expect(summary.utilization).toBeCloseTo(0.25, 5);
  });

  it("predicts the next statement date from the statement day", () => {
    // The 15th has already passed relative to "from", so it should step to September.
    const [summary] = computeCardSummaries([card({ statementDay: 15 })], [], "2026-08-25");
    expect(summary.nextStatementDate).toBe("2026-09-15");
  });
});

describe("totalCardOutstanding", () => {
  it("counts unpaid bills on closed cards too, since they're still owed", () => {
    const cards = [card({ id: "c1", status: "Active" }), card({ id: "c2", status: "Closed" })];
    const statements = [
      statement({ cardId: "c1", totalAmountDue: 5000 }),
      statement({ cardId: "c2", totalAmountDue: 9000 }),
    ];
    expect(totalCardOutstanding(cards, statements)).toBe(14000);
  });

  it("leaves out statements whose card no longer exists", () => {
    const statements = [statement({ cardId: "c1", totalAmountDue: 5000 }), statement({ cardId: "gone", totalAmountDue: 9000 })];
    expect(totalCardOutstanding([card({ id: "c1" })], statements)).toBe(5000);
  });
});
