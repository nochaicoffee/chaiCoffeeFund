import { describe, expect, it } from "vitest";
import type { ExpenseData } from "@/lib/aggregate/expenses";
import type { Account, BalanceSnapshot, BigSpend, Statement } from "@/lib/sheets/types";
import { bigSpendsView, expenseModel, greetingView, heroView, monthsView, spentTile, summarySentence, whereView } from "./views";

const account = (id: string, over: Partial<Account> = {}): Account => ({ id, name: id.toUpperCase(), bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active", ...over });
const bal = (accountId: string, date: string, balance: number): BalanceSnapshot => ({ id: `${accountId}@${date}`, accountId, date, balance });
const paid = (id: string, paidDate: string, amount: number, statementDate = "2026-10-20"): Statement => ({ id, cardId: "c1", statementDate, dueDate: paidDate, totalAmountDue: amount, minimumAmountDue: 1, status: "Paid", amountPaid: amount, paidDate, paidFromAccountId: "hdfc" });

function data(over: Partial<ExpenseData> = {}): ExpenseData {
  return {
    accounts: [account("hdfc"), account("ibkr", { name: "IBKR", accountType: "Brokerage", currency: "USD" })],
    snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 130000), bal("ibkr", "2026-10-31", 1000), bal("ibkr", "2026-11-30", 1000)],
    usdInr: [{ date: "2026-11-30", close: 88 }],
    usdInrToday: 88,
    incomeEntries: [{ id: "i", incomeSourceId: "s", expectedDate: "2026-11-01", receivedDate: "2026-11-01", amount: 200000, status: "Received", tag: "Regular" }],
    incomeSources: [],
    cards: [{ id: "c1", name: "Regalia", alias: "HDFC Regalia", issuer: "HDFC-Bank", cardType: "Reward-Points", creditLimit: 1, statementDay: 20, dueDayBuffer: 19, status: "Active" }],
    statements: [paid("s1", "2026-11-05", 60000)],
    subscriptions: [],
    subscriptionPayments: [],
    loans: [],
    installments: [],
    prepayments: [],
    policies: [],
    policyPayments: [],
    trades: [{ id: "t", tradeDate: "2026-11-10", symbol: "NIFTYBEES", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 1, price: 50000, total: 50000, assetType: "ETF", broker: "Zerodha" }],
    fixedDeposits: [],
    lentLoans: [],
    lentRepayments: [],
    bigSpends: [],
    ...over,
  } as ExpenseData;
}

const pointsOf = (parts: ReturnType<typeof summarySentence>) => parts.filter((p) => p.point).map((p) => p.point as string);
const spend = (over: Partial<BigSpend>): BigSpend => ({ id: "b", date: "2026-10-10", amount: 24500, name: "Diwali shopping", category: "Shopping", paidFromCardId: "c1", ...over });

describe("the Expenses greeting", () => {
  it("on a worked-out month, every figure it points at has a card that agrees with it", () => {
    const model = expenseModel(data({ bigSpends: [spend({})] }), "2026-12-09");
    expect(model.picked.month).toBe("2026-11");
    const parts = summarySentence(model);
    const cards = greetingView(model);
    expect(pointsOf(parts)).toEqual(["spent", "cash", "invested", "kept", "big"]);
    for (const point of pointsOf(parts)) expect(cards[point as keyof typeof cards]).toBeDefined();
    const figure = (point: string) => parts.find((p) => p.point === point)?.text;
    expect(figure("spent")).toBe(cards.spent?.total);
    expect(figure("cash")).toBe(cards.cash?.total);
    expect(figure("invested")).toBe(cards.invested?.total);
    expect(figure("kept")).toBe(cards.kept?.total);
    // 2,00,000 came in, 50,000 bought, 30,000 kept: 1,20,000 spent, 60,000 of it the card bill.
    expect(figure("spent")).toBe("₹1,20,000");
    expect(figure("cash")).toBe("₹60,000");
  });

  it("says when savings were drawn on, rather than a negative kept", () => {
    const model = expenseModel(data({ snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 40000), bal("ibkr", "2026-10-31", 0), bal("ibkr", "2026-11-30", 0)] }), "2026-12-09");
    expect(summarySentence(model).map((p) => p.text).join("")).toContain("₹60,000 came out of savings");
    expect(greetingView(model).kept?.title).toBe("What came out of savings");
  });

  it("on the month in progress, points at what's recorded so far and never says spent", () => {
    const model = expenseModel(data(), "2026-11-20");
    const parts = summarySentence(model);
    expect(model.picked.status).toBe("progress");
    expect(pointsOf(parts)).toEqual(["explained", "cameIn"]);
    expect(parts.find((p) => p.point === "explained")?.text).toBe(greetingView(model).explained?.total);
    expect(parts.map((p) => p.text).join("")).not.toContain("spent");
  });

  it("on a month that can't be worked out, says why", () => {
    const model = expenseModel(data({ snapshots: [bal("hdfc", "2026-10-31", 1), bal("ibkr", "2026-11-30", 1)] }), "2026-12-09", "2026-11");
    expect(summarySentence(model)[0].text).toContain("broker cash not recorded (IBKR)");
    expect(heroView(model).notice).toContain("IBKR");
  });
});

describe("the page's blocks", () => {
  it("opens on the month asked for, and moves the hero, Where it went and the table with it", () => {
    const model = expenseModel(data(), "2026-12-09", "2026-11");
    expect(heroView(model).chips.find((c) => c.picked)?.month).toBe("2026-11");
    expect(whereView(model).title).toBe("Where November went");
    expect(monthsView(model).rows.find((r) => r.picked)?.month).toBe("2026-11");
  });

  it("splits what came in so the bars add up to all of it", () => {
    const hero = heroView(expenseModel(data(), "2026-12-09"));
    expect(hero.split.map((s) => s.key)).toEqual(["spent", "invested", "kept"]);
    expect(hero.split.reduce((t, s) => t + s.share, 0)).toBeCloseTo(1, 9);
    expect(hero.parts.reduce((t, s) => t + s.share, 0)).toBeCloseTo(1, 9);
  });

  it("lists big spends newest first, one in an unpaid bill as waiting", () => {
    const statements = [paid("s1", "2026-11-05", 60000), { ...paid("s2", "", 0, "2026-11-20"), status: "Pending" as const, paidDate: undefined }];
    const model = expenseModel(data({ statements, bigSpends: [spend({ id: "old" }), spend({ id: "new", date: "2026-11-12", name: "Phone", category: "Electronics" })] }), "2026-12-09");
    const view = bigSpendsView(model);
    expect(view?.rows.map((r) => [r.id, r.when])).toEqual([["new", "in a card bill not paid yet"], ["old", "counts in Nov"]]);
    expect(bigSpendsView(expenseModel(data(), "2026-12-09"))).toBeNull();
  });

  it("totals only the months worked out", () => {
    const view = monthsView(expenseModel(data(), "2026-12-09"));
    expect(view.doneCount).toBe(1);
    expect(view.total.spent).toBe("₹1,20,000");
    expect(view.rows[0]).toMatchObject({ month: "2026-12", spent: "so far" });
  });
});

describe("the Overview's Spent tile", () => {
  it("shows the latest month worked out", () => {
    const tile = spentTile(expenseModel(data(), "2026-12-09"));
    expect(tile).toMatchObject({ value: "₹1.2L", tag: "in Nov", sub: "₹60.0k cash, UPI" });
    expect(tile.card.total).toBe("₹1,20,000");
  });
  it("shows what's paid so far when no month is worked out yet", () => {
    expect(spentTile(expenseModel(data(), "2026-11-20"))).toMatchObject({ value: "₹60.0k", tag: "so far", sub: "paid in Nov" });
  });
});
