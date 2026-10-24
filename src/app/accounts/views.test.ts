import { describe, expect, it } from "vitest";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { thisYear } from "@/lib/aggregate/period";
import { demoAccountsData, demoReviews } from "@/lib/demo/accountsDemo";
import { sentenceText } from "../cards/summarySentence";
import { ALL, accountsPageView, formsView, greetingView, historyRows, mixBlocks, summarySentence } from "./views";

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

describe("balances a statement disagreed with", () => {
  const withReview: AccountsData = { ...demo, reviews: demoReviews(demo, today) };
  const parts = summarySentence(withReview, today, period);
  const cards = greetingView(withReview, today, period);

  it("is said in the greeting, as a figure that points at a card of its own", () => {
    expect(sentenceText(parts)).toContain("1 balance from your statements needs a look.");
    expect(parts.find((p) => p.point === "attention")).toMatchObject({ text: "1 balance", strong: true });
    expect(cards.attention).toMatchObject({ title: "A statement disagrees" });
    expect(cards.attention?.rows).toHaveLength(1);
    expect(cards.attention?.rows[0]).toMatchObject({ name: "HDFC Salary", amount: "−₹13", warn: true });
    for (const part of parts) if (part.point) expect(cards[part.point as keyof typeof cards], part.point).toBeDefined();
  });

  it("is not mentioned when nothing is waiting", () => {
    expect(sentenceText(summarySentence(demo, today, period))).not.toContain("needs a look");
    expect(greetingView(demo, today, period).attention).toBeUndefined();
  });

  it("marks the balance it is about in Balance history, and no other", () => {
    const view = accountsPageView(withReview, today, period);
    expect(view.attention).toHaveLength(1);
    const marked = view.history.all.filter((r) => r.attention);
    expect(marked).toHaveLength(1);
    expect(marked[0].id).toBe(view.attention[0].snapshotId);
    expect(view.history[marked[0].accountId].filter((r) => r.attention)).toHaveLength(1);
  });

  it("does not mark a balance moved to another day, though it is the one the review named", () => {
    const [review] = withReview.reviews!;
    const moved: AccountsData = { ...withReview, snapshots: withReview.snapshots.map((s) => (s.id === review.snapshotId ? { ...s, date: "2026-01-02" } : s)) };
    expect(historyRows(moved).all.filter((r) => r.attention)).toHaveLength(0);
  });

  it("finds the balance by account and day if the one the review named was re-entered", () => {
    const [review] = withReview.reviews!;
    const moved: AccountsData = { ...withReview, reviews: [{ ...review, snapshotId: "deleted-long-ago" }] };
    expect(historyRows(moved).all.filter((r) => r.attention)).toHaveLength(1);
  });
});

describe("balances from a statement in Balance history", () => {
  it("are marked, and the rest are not", () => {
    const [first, second] = demo.snapshots.filter((x) => x.accountId === "demo-hdfc");
    const marked = historyRows({ ...demo, snapshots: demo.snapshots.map((x) => (x.id === first.id ? { ...x, source: "Statement" as const } : x)) });
    expect(marked.all.filter((r) => r.fromStatement).map((r) => r.id)).toEqual([first.id]);
    expect(marked.all.find((r) => r.id === second.id)?.fromStatement).toBeUndefined();
  });
});

describe("the mix", () => {
  const blocks = mixBlocks(demo, today);
  it("holds every open account with money, biggest first, sizes and shares adding up", () => {
    expect(blocks.map((b) => b.id)).toEqual(["demo-sbi", "demo-hdfc", "demo-icici", "demo-kotak", "demo-axis"]);
    expect(blocks.reduce((t, b) => t + b.share, 0)).toBeCloseTo(1, 10);
    expect(blocks.reduce((t, b) => t + b.monthly, 0)).toBe(accountsPageView(demo, today, period).picks[0].balanceValue);
  });
  it("groups by the account's purpose", () => {
    expect(blocks.find((b) => b.id === "demo-sbi")).toMatchObject({ category: "Emergency-Fund", categoryLabel: "Emergency Fund" });
  });
});

describe("Balance history", () => {
  const history = historyRows(demo);
  it("lists an account's balances newest first, each with its change from the one before", () => {
    const hdfc = history["demo-hdfc"];
    expect(hdfc[0].date > hdfc[1].date).toBe(true);
    expect(hdfc[0].changeText).toBe("+₹22,000");
    expect(hdfc.at(-1)).toMatchObject({ changeText: "First balance", gapText: null });
  });
  it("lists every account's balances under All, and a gap in days", () => {
    expect(history[ALL]).toHaveLength(Object.entries(history).filter(([k]) => k !== ALL).reduce((n, [, rows]) => n + rows.length, 0));
    expect(history["demo-hdfc"][0].gapText).toBe("31 days after the one before");
  });
});

describe("a past period", () => {
  it("measures the change to the period's end, so it agrees with the chart beside it", () => {
    const past = accountsPageView(demo, today, { kind: "year", year: 2025 }, false);
    // The demo has no balances in 2025, so nothing moved then; the change to today would be the whole total.
    expect(past.picks[0].change).toMatch(/^\+₹0 since Jan 1/);
    expect(summarySentence(demo, today, { kind: "year", year: 2026 }).map((p) => p.text).join("")).toContain("up");
  });
});

describe("links to the Balance history page", () => {
  it("opens All for All and the account's own for an account, carrying the period and demo", () => {
    const v = accountsPageView(demo, today, { kind: "range", from: "2026-03", to: "2026-08" }, true);
    expect(v.historyHrefs[ALL]).toBe("/accounts/history?period=2026-03..2026-08&demo");
    expect(v.historyHrefs["demo-hdfc"]).toBe("/accounts/history?account=demo-hdfc&period=2026-03..2026-08&demo");
    expect(accountsPageView(demo, today, period, false).historyHrefs[ALL]).toBe("/accounts/history");
  });
});

describe("a statement PDF password", () => {
  const withPassword: AccountsData = { ...demo, accounts: demo.accounts.map((a, i) => (i === 0 ? { ...a, statementPdfPassword: "s3cret-Pw" } : a)) };
  const forms = formsView(withPassword, today, false);

  it("tells the form that one is saved, but never carries it to the browser", () => {
    expect(forms.accounts.find((a) => a.id === demo.accounts[0].id)?.hasPdfPassword).toBe(true);
    expect(forms.accounts.filter((a) => a.hasPdfPassword)).toHaveLength(1);
    expect(JSON.stringify(forms)).not.toContain("s3cret-Pw");
  });

  it("stays out of the page's own data too", () => {
    expect(JSON.stringify(accountsPageView(withPassword, today, period))).not.toContain("s3cret-Pw");
  });
});
