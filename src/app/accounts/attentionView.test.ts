import { describe, expect, it } from "vitest";
import type { Account, BalanceReview } from "@/lib/sheets/types";
import { attentionItems } from "./attentionView";

const account = (id: string, overrides: Partial<Account> = {}): Account => ({ id, name: `Account ${id}`, bank: "Bank", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active", ...overrides });
const review = (id: string, overrides: Partial<BalanceReview> = {}): BalanceReview => ({
  id,
  accountId: "a",
  date: "2026-09-30",
  snapshotId: "snap",
  recordedBalance: 13691.8,
  statementBalance: 13678.8,
  messageId: "m",
  status: "Open",
  createdAt: "2026-10-23T06:00:00Z",
  ...overrides,
});

describe("attentionItems", () => {
  it("is one item per open review, with both balances, the gap and its direction, ready to show", () => {
    const [item] = attentionItems({ accounts: [account("a")], reviews: [review("r1")] });
    expect(item).toMatchObject({ id: "r1", accountId: "a", accountName: "Account a", date: "2026-09-30", dateText: "Sep 30, 2026", recordedText: "₹13,691.80", statementText: "₹13,678.80", differenceText: "−₹13", differenceTone: "down", snapshotId: "snap" });
  });

  it("leaves out answered and replaced reviews, and those of an account that is gone", () => {
    const items = attentionItems({
      accounts: [account("a")],
      reviews: [review("open"), review("kept", { status: "Kept" }), review("accepted", { status: "Accepted" }), review("old", { status: "Superseded" }), review("gone", { accountId: "deleted" })],
    });
    expect(items.map((i) => i.id)).toEqual(["open"]);
  });

  it("is newest day first, and empty without reviews", () => {
    const items = attentionItems({ accounts: [account("a")], reviews: [review("early", { date: "2026-08-31" }), review("late", { date: "2026-09-30" })] });
    expect(items.map((i) => i.id)).toEqual(["late", "early"]);
    expect(attentionItems({ accounts: [account("a")] })).toEqual([]);
  });

  it("reads a statement above the recorded balance as up, and names a gap of paise exactly", () => {
    const [item] = attentionItems({ accounts: [account("a")], reviews: [review("r", { recordedBalance: 100, statementBalance: 100.25 })] });
    expect(item).toMatchObject({ differenceText: "+₹0.25", differenceTone: "up" });
  });
});
