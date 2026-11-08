import { describe, expect, it } from "vitest";
import type { ExpenseData } from "@/lib/aggregate/expenses";
import type { Account, BalanceSnapshot, Statement } from "@/lib/sheets/types";
import { expenseModel } from "../views";
import { ledgerView, monthStatementView } from "./statementsView";

const account = (id: string, name: string): Account => ({ id, name, bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active" });
const bal = (accountId: string, date: string, balance: number): BalanceSnapshot => ({ id: `${accountId}@${date}`, accountId, date, balance });
const bill = (id: string, statementDate: string, paidDate: string, amount: number): Statement => ({ id, cardId: "c1", statementDate, dueDate: paidDate, totalAmountDue: amount, minimumAmountDue: 1, status: "Paid", amountPaid: amount, paidDate, paidFromAccountId: "hdfc" });

function data(over: Partial<ExpenseData> = {}): ExpenseData {
  return {
    accounts: [account("hdfc", "HDFC Bank Account")],
    snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 130000)],
    usdInr: [],
    usdInrToday: 88,
    incomeEntries: [{ id: "i", incomeSourceId: "s", expectedDate: "2026-11-01", receivedDate: "2026-11-01", amount: 200000, status: "Received", tag: "Regular" }],
    incomeSources: [],
    cards: [{ id: "c1", name: "Amex", alias: "Amex", issuer: "Other", cardType: "Reward-Points", creditLimit: 1, statementDay: 20, dueDayBuffer: 19, status: "Active" }],
    statements: [bill("oct", "2026-10-20", "2026-11-05", 60000)],
    subscriptions: [],
    subscriptionPayments: [],
    loans: [],
    installments: [],
    prepayments: [],
    policies: [],
    policyPayments: [],
    trades: [],
    fixedDeposits: [],
    lentLoans: [],
    lentRepayments: [],
    bigSpends: [
      { id: "diwali", date: "2026-10-12", amount: 24500, name: "Diwali shopping", category: "Shopping", paidFromCardId: "c1" },
      { id: "sofa", date: "2026-11-15", amount: 30000, name: "Sofa", category: "Home", paidFromAccountId: "hdfc" },
    ],
    ...over,
  } as ExpenseData;
}

describe("Statements (every month)", () => {
  const view = ledgerView(expenseModel(data(), "2026-12-09"));
  const nov = view.months.find((m) => m.month === "2026-11")!;

  it("puts each big spend on the bill or cash line it sits in", () => {
    expect(nov.rows.find((r) => r.part === "card")?.tags.map((t) => t.key)).toEqual(["diwali"]);
    expect(nov.rows.find((r) => r.part === "cash")?.tags.map((t) => t.key)).toEqual(["sofa"]);
    expect(view.bigCount).toBe(2);
  });

  it("names where each payment came from, and cash and UPI from every account", () => {
    expect(nov.rows.find((r) => r.part === "card")?.from).toBe("From HDFC Bank Account");
    expect(nov.rows.find((r) => r.part === "cash")?.from).toBe("From every account");
  });

  it("finds a payment by its amount typed without commas", () => {
    expect(nov.rows.find((r) => r.part === "card")?.search).toContain("60000");
  });

  it("counts the rows by kind, newest month first", () => {
    expect(view.months[0].month).toBe("2026-12");
    expect(view.counts).toMatchObject({ all: 2, card: 1, cash: 1 });
  });
});

describe("One month", () => {
  it("adds up from the start to the end of the month", () => {
    const view = monthStatementView(expenseModel(data(), "2026-12-09", "2026-11"));
    expect(view.addsUp?.map((a) => [a.key, a.amount])).toEqual([["start", "₹1,00,000"], ["in", "+₹2,00,000"], ["spent", "−₹1,70,000"]]);
    expect(view.end).toBe("₹1,30,000");
    expect(view.sections.map((s) => [s.part, s.total])).toEqual([["card", "₹60,000"], ["cash", "₹1,10,000"]]);
    expect(view.total).toEqual({ label: "Total spent", amount: "₹1,70,000" });
    expect(view.prev).toBe("2026-10");
    expect(view.next).toBe("2026-12");
  });

  it("on the month in progress, shows the payments so far and no sum, and a big spend from an account on its own", () => {
    const view = monthStatementView(expenseModel(data(), "2026-11-20", "2026-11"));
    expect(view.loose.map((t) => t.key)).toEqual(["sofa"]);
    expect(ledgerView(expenseModel(data(), "2026-11-20")).months[0].loose.map((t) => t.key)).toEqual(["sofa"]);
    expect(view.status).toBe("progress");
    expect(view.addsUp).toBeNull();
    expect(view.total).toEqual({ label: "Paid so far", amount: "₹60,000" });
    expect(view.next).toBeNull();
  });
});
