import { describe, expect, it } from "vitest";
import type { AccountStatement, ReviewRecord, StatementRow } from "../aggregate/statementBalances";
import type { ParseResult } from "../accountStatementParsing/types";
import type { Account, BalanceSnapshot } from "../sheets/types";
import { planStatement, summarizeEmail, type PlanContext } from "./planStatements";

const account = (overrides: Partial<Account> = {}): Account => ({ id: "slice", name: "Slice Bank Account", bank: "slice small finance bank", accountType: "Savings", purpose: "Spending", startDate: "2025-01-01", status: "Active", last4: "1128", ...overrides });
const statementOf = (periodStart: string, periodEnd: string, opening: number, movements: [string, number][]): AccountStatement => {
  let running = Math.round(opening * 100);
  const rows: StatementRow[] = movements.map(([date, amount]) => {
    running += Math.round(amount * 100);
    return { date, amount, balance: running / 100 };
  });
  return { periodStart, periodEnd, openingBalance: opening, closingBalance: running / 100, rows };
};
const read = (statement: AccountStatement, last4: string | null = "1128", bank: "Slice" | "HDFC" | "Jupiter" = "Slice"): ParseResult => ({ ok: true, parsed: { bank, ...(last4 && { accountLast4: last4 }), statement } });
const context = (overrides: Partial<PlanContext> = {}): PlanContext => ({ accounts: [account()], snapshots: [], reviews: [], today: "2026-10-23", ...overrides });
const snap = (id: string, date: string, balance: number): BalanceSnapshot => ({ id, accountId: "slice", date, balance });
const august = statementOf("2026-08-01", "2026-08-31", 1000, [["2026-08-05", -200], ["2026-08-20", 50]]);

describe("planStatement", () => {
  it("creates the opening and closing balance for an account with none", () => {
    const plan = planStatement(read(august), context());
    expect(plan.outcome).toMatchObject({ result: "imported", accountId: "slice", created: 2, unchanged: 0, reviews: [] });
    expect(plan.writes.creates).toEqual([
      { date: "2026-07-31", balance: 1000 },
      { date: "2026-08-31", balance: 850 },
    ]);
  });

  it("is unchanged when the Sheet already has every balance, to the paisa", () => {
    const plan = planStatement(read(august), context({ snapshots: [snap("a", "2026-07-31", 1000), snap("b", "2026-08-31", 850.0)] }));
    expect(plan.outcome).toMatchObject({ result: "unchanged", created: 0, unchanged: 2 });
    expect(plan.writes.creates).toEqual([]);
  });

  it("leaves a recorded balance alone when the statement disagrees, and opens a review with both values", () => {
    const plan = planStatement(read(august), context({ snapshots: [snap("b", "2026-08-31", 800)] }));
    expect(plan.outcome.result).toBe("imported");
    expect(plan.outcome.reviews).toEqual([{ date: "2026-08-31", recordedBalance: 800, statementBalance: 850, bigDrop: false }]);
    expect(plan.writes.creates.map((c) => c.date)).toEqual(["2026-07-31"]);
    expect(plan.writes.reviews[0]).toMatchObject({ type: "mismatch", snapshotId: "b", recordedBalance: 800, balance: 850 });
  });

  it("does not open the same review twice, however it was answered", () => {
    const review: ReviewRecord = { id: "r1", accountId: "slice", date: "2026-08-31", statementBalance: 850, status: "Kept" };
    const plan = planStatement(read(august), context({ snapshots: [snap("a", "2026-07-31", 1000), snap("b", "2026-08-31", 800)], reviews: [review] }));
    expect(plan.outcome.reviews).toEqual([]);
    expect(plan.outcome.result).toBe("unchanged");
    expect(plan.writes.reviews).toEqual([]);
  });

  it("a corrected statement supersedes the open review for that day", () => {
    const review: ReviewRecord = { id: "r1", accountId: "slice", date: "2026-08-31", statementBalance: 825, status: "Open" };
    const plan = planStatement(read(august), context({ snapshots: [snap("a", "2026-07-31", 1000), snap("b", "2026-08-31", 800)], reviews: [review] }));
    expect(plan.writes.supersede).toEqual(["r1"]);
    expect(plan.outcome.reviews).toHaveLength(1);
  });

  it("fills in the last 4 of the bank's only unnumbered account, and says so", () => {
    const plan = planStatement(read(august), context({ accounts: [account({ last4: undefined })] }));
    expect(plan.writes.fillLast4).toEqual({ accountId: "slice", last4: "1128" });
    expect(plan.outcome.notes).toEqual(["filled in Slice Bank Account's last 4 (1128) from the statement"]);
  });

  it("does not fill in a last 4 from one of several statements in a PDF", () => {
    const plan = planStatement(read(august), context({ accounts: [account({ last4: undefined })], singleStatement: false }));
    expect(plan.outcome).toMatchObject({ result: "skipped", problem: "no-account" });
    expect(plan.writes.fillLast4).toBeUndefined();
    expect(plan.writes.creates).toEqual([]);
  });

  it("skips, with the reason, a statement whose numbers do not add up, and writes nothing", () => {
    const bad = { ...august, closingBalance: august.closingBalance + 1 };
    const plan = planStatement(read(bad), context());
    expect(plan.outcome).toMatchObject({ result: "skipped", problem: "numbers", reason: "the last balance doesn't match the closing balance" });
    expect(plan.writes).toEqual({ creates: [], reviews: [], supersede: [] });
  });

  it("skips a statement for an account it can't match, or can't tell apart", () => {
    expect(planStatement(read(august, "9999"), context()).outcome).toMatchObject({ problem: "no-account" });
    expect(planStatement(read(august, null), context({ accounts: [account({ id: "a" }), account({ id: "b", last4: "2222" })] })).outcome).toMatchObject({ problem: "several-accounts" });
    expect(planStatement(read(august, "1128", "HDFC"), context()).outcome).toMatchObject({ problem: "no-account", reason: "no account is with HDFC" });
  });

  it("skips a closed account, a period not over yet, and one before the account opened", () => {
    expect(planStatement(read(august), context({ accounts: [account({ status: "Inactive" })] })).outcome).toMatchObject({ problem: "closed-account", reason: "Slice Bank Account is closed. Reopen it to import its statements" });
    expect(planStatement(read(august), context({ today: "2026-08-15" })).outcome).toMatchObject({ problem: "period-in-future" });
    expect(planStatement(read(august), context({ accounts: [account({ startDate: "2026-09-01" })] })).outcome).toMatchObject({ problem: "before-account-opened" });
  });

  it("drops balances dated before the account opened but uses the rest of the statement", () => {
    const plan = planStatement(read(august), context({ accounts: [account({ startDate: "2026-08-01" })] }));
    expect(plan.writes.creates.map((c) => c.date)).toEqual(["2026-08-31"]);
  });

  it("reports a PDF the parser could not read, with its reason", () => {
    expect(planStatement({ ok: false, problem: "couldn't read the closing balance" }, context()).outcome).toMatchObject({ result: "skipped", problem: "unreadable", reason: "couldn't read the closing balance" });
  });

  it("a monthly inside a range already imported agrees on the shared days: nothing new, no review", () => {
    const range = statementOf("2026-01-01", "2026-09-30", 100, [["2026-01-15", 10], ["2026-08-20", 5], ["2026-09-10", 1]]);
    const first = planStatement(read(range), context());
    const recorded = first.writes.creates.map((c, i) => snap(`r${i}`, c.date, c.balance));
    const sep = statementOf("2026-09-01", "2026-09-30", 115, [["2026-09-10", 1]]);
    const second = planStatement(read(sep), context({ snapshots: recorded }));
    expect(second.outcome).toMatchObject({ result: "unchanged", created: 0, reviews: [] });
  });

  it("flags a statement balance far below the one before it", () => {
    const drop = statementOf("2026-09-01", "2026-09-30", 1000, [["2026-09-10", -600]]);
    const plan = planStatement(read(drop), context({ snapshots: [snap("a", "2026-08-31", 1000), snap("b", "2026-09-30", 500)] }));
    expect(plan.outcome.reviews[0].bigDrop).toBe(true);
  });
});

describe("summarizeEmail", () => {
  const base = { messageId: "m", subject: "s" };
  const outcome = (result: "imported" | "unchanged" | "skipped", extra = {}) => ({ result, created: 0, unchanged: 0, reviews: [], notes: [], ...extra });

  it("is imported if any statement changed something, unchanged if all were there already", () => {
    expect(summarizeEmail(base, [outcome("unchanged"), outcome("imported")]).result).toBe("imported");
    expect(summarizeEmail(base, [outcome("unchanged")]).result).toBe("unchanged");
  });

  it("is done once the accounts you track are, even if the PDF holds one you don't", () => {
    const email = summarizeEmail(base, [outcome("imported"), outcome("skipped", { problem: "no-account", reason: "x" })]);
    expect(email.result).toBe("imported");
    expect(email.statements).toHaveLength(2);
  });

  it("is skipped, with the first statement's reason, when none could be used", () => {
    expect(summarizeEmail(base, [outcome("skipped", { problem: "locked", reason: "why" })])).toMatchObject({ result: "skipped", problem: "locked", reason: "why" });
    expect(summarizeEmail(base, [outcome("skipped", { problem: "numbers", reason: "why" }), outcome("skipped", { problem: "no-account", reason: "x" })]).reason).toBe("none of its 2 statements could be used: why");
  });
});
