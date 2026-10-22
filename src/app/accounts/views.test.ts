import { describe, expect, it } from "vitest";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { thisYear } from "@/lib/aggregate/period";
import { demoAccountsData } from "@/lib/demo/accountsDemo";
import { sentenceText } from "../cards/summarySentence";
import { ALL, accountsPageView, greetingView, summarySentence } from "./views";

const today = "2026-10-22";
const period = thisYear(today);
const demo = demoAccountsData(today);
const none: AccountsData = { ...demo, accounts: [], snapshots: [] };

describe("accountsPageView", () => {
  const view = accountsPageView(demo, today, period);

  it("opens with All, then each account, closed ones last", () => {
    expect(view.picks.map((p) => p.id)).toEqual([ALL, "demo-hdfc", "demo-sbi", "demo-kotak", "demo-axis", "demo-icici", "demo-yes"]);
    expect(view.picks.at(-1)).toMatchObject({ closed: true, balanceValue: 0 });
  });

  it("makes All the total of what every account holds today, and the total of the pick values", () => {
    const all = view.picks[0];
    const accounts = view.picks.slice(1);
    expect(all.balanceValue).toBe(accounts.reduce((sum, p) => sum + p.balanceValue, 0));
  });

  it("marks only the account not read in over 30 days as stale", () => {
    expect(view.picks.filter((p) => p.stale).map((p) => p.id)).toEqual(["demo-sbi"]);
    expect(view.picks[0].updated).toBe("5 accounts · 4 up to date");
  });

  it("takes an account's own colour, else its purpose's, and All is emerald", () => {
    expect(view.picks[0].colorKey).toBe("emerald");
    expect(view.picks.find((p) => p.id === "demo-sbi")?.colorKey).toBe("teal");
    expect(view.picks.find((p) => p.id === "demo-yes")?.colorKey).toBe("onyx");
  });

  it("steps All aside with one account (decision 6)", () => {
    const one = accountsPageView({ ...demo, accounts: [demo.accounts[0]] }, today, period);
    expect(one.picks.map((p) => p.id)).toEqual(["demo-hdfc"]);
  });

  it("shows ₹0 and no line with no accounts", () => {
    const empty = accountsPageView(none, today, period);
    expect(empty.hasAccounts).toBe(false);
    expect(empty.picks).toHaveLength(1);
    expect(empty.picks[0].line.points).toEqual([]);
  });

  it("starts an account's line at its first balance, never before", () => {
    const yes = view.picks.find((p) => p.id === "demo-yes")!;
    expect(yes.line.points[0].date >= "2026-01-10").toBe(true);
  });
});

describe("the greeting", () => {
  it("reads the same figures as the pick's, and every pointed figure has a card", () => {
    const parts = summarySentence(demo, today, period);
    const cards = greetingView(demo, today, period);
    for (const part of parts) if (part.point) expect(cards[part.point as keyof typeof cards], part.point).toBeDefined();
    expect(sentenceText(parts)).toContain("5 accounts");
    expect(sentenceText(parts)).toContain("SBI Rainy Day");
  });

  it("says so, with nothing pointing, when there are no accounts or no balances yet", () => {
    expect(summarySentence(none, today, period).some((p) => p.point)).toBe(false);
    const noBalances = { ...demo, snapshots: [] };
    expect(sentenceText(summarySentence(noBalances, today, period))).toMatch(/no balances yet/);
    expect(greetingView(noBalances, today, period)).toEqual({});
  });
});
