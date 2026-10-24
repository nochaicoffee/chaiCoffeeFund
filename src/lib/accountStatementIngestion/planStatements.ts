import { balancesFromStatement, checkStatement, planReviews, reconcile, statementSkipReason, type ReviewRecord, type SkipReason } from "../aggregate/statementBalances";
import { matchAccount } from "../accountStatementParsing/matchAccount";
import type { ParseResult } from "../accountStatementParsing/types";
import type { Account, BalanceSnapshot } from "../sheets/types";
import type { AccountSyncProblem, EmailOutcome, StatementOutcome, StatementWrites } from "./types";

/**
 * The decisions for one statement, pure: given what was read from the PDF, the accounts, the
 * balances recorded and the reviews so far, what is created, what is already there, what disagrees
 * (and so opens a review), and what is skipped and why. The sync does the reading and writing around
 * it (run.ts); everything it can get wrong is here, so it is tested on fixtures.
 */

export interface PlanContext {
  accounts: Account[];
  /** The balances recorded, including any an earlier email in this sync has just planned. */
  snapshots: BalanceSnapshot[];
  reviews: ReviewRecord[];
  today: string;
  /** Whether a statement may give an account its last 4: only when it is the PDF's one statement (matchAccount). */
  singleStatement?: boolean;
}

export interface StatementPlan {
  outcome: StatementOutcome;
  writes: StatementWrites;
}

const EMPTY: StatementWrites = { creates: [], reviews: [], supersede: [] };
const skipped = (problem: AccountSyncProblem, reason: string, extra: Partial<StatementOutcome> = {}): StatementPlan => ({
  outcome: { result: "skipped", problem, reason, created: 0, unchanged: 0, reviews: [], notes: [], ...extra },
  writes: EMPTY,
});

const SKIP_TEXT: Record<SkipReason, { problem: AccountSyncProblem; reason: (name: string) => string }> = {
  "closed-account": { problem: "closed-account", reason: (name) => `${name} is closed. Reopen it to import its statements` },
  "period-in-future": { problem: "period-in-future", reason: () => "the statement's period hasn't ended yet" },
  "before-account-opened": { problem: "before-account-opened", reason: (name) => `the statement ends before ${name} was opened` },
};

export function planStatement(read: ParseResult, context: PlanContext): StatementPlan {
  if (!read.ok) return skipped("unreadable", read.problem);
  const { parsed } = read;
  const { statement } = parsed;
  const period = { bank: parsed.bank, periodStart: statement.periodStart, periodEnd: statement.periodEnd };

  const check = checkStatement(statement);
  if (!check.ok) return skipped("numbers", check.problem, period);

  const match = matchAccount(context.accounts, parsed.bank, parsed.accountLast4, { fillLast4: context.singleStatement ?? true });
  if (match.kind === "none") return skipped("no-account", match.reason, period);
  if (match.kind === "several") return skipped("several-accounts", `more than one account could be this ${parsed.bank} statement: ${match.accounts.map((a) => a.name).join(", ")}. Set each one's last 4 in Edit account`, period);
  const account = match.account;
  const named = { ...period, accountId: account.id, accountName: account.name };

  const why = statementSkipReason(account, statement, context.today);
  if (why) return skipped(SKIP_TEXT[why].problem, SKIP_TEXT[why].reason(account.name), named);

  const actions = reconcile(context.snapshots, account.id, balancesFromStatement(statement), account.startDate);
  const { create: toReview, supersede } = planReviews(actions, account.id, context.reviews);
  const creates = actions.flatMap((a) => (a.type === "create" ? [{ date: a.date, balance: a.balance }] : []));
  const unchanged = actions.filter((a) => a.type === "unchanged").length;
  const notes: string[] = [];
  const fillLast4 = match.kind === "fill-last4" ? { accountId: account.id, last4: match.last4 } : undefined;
  if (fillLast4) notes.push(`filled in ${account.name}'s last 4 (${fillLast4.last4}) from the statement`);

  // Mismatches already waiting (or answered) for the same value are not new, but are still not "unchanged".
  const mismatches = actions.filter((a) => a.type === "mismatch");
  const changed = creates.length > 0 || toReview.length > 0 || fillLast4 !== undefined;
  return {
    outcome: {
      result: changed ? "imported" : "unchanged",
      ...named,
      created: creates.length,
      unchanged,
      reviews: toReview.map((m) => ({ date: m.date, recordedBalance: m.recordedBalance, statementBalance: m.balance, bigDrop: m.bigDrop })),
      notes: mismatches.length > toReview.length ? [...notes, `${mismatches.length - toReview.length} disagreement(s) already reviewed or waiting`] : notes,
    },
    writes: { creates, reviews: toReview, supersede, ...(fillLast4 && { fillLast4 }) },
  };
}

/**
 * One result for an email from its statements': imported if any changed something, unchanged if all
 * were already in the Sheet, skipped if none could be used. A PDF holding accounts you don't track
 * is still done once the ones you do are: the rest are reported, not retried for ever.
 */
export function summarizeEmail(base: Pick<EmailOutcome, "messageId" | "subject" | "receivedDate">, statements: StatementOutcome[]): EmailOutcome {
  const used = statements.filter((s) => s.result !== "skipped");
  if (used.length === 0) {
    const first = statements[0];
    return { ...base, result: "skipped", problem: first?.problem, reason: statements.length > 1 ? `none of its ${statements.length} statements could be used: ${first?.reason}` : first?.reason, statements };
  }
  return { ...base, result: used.some((s) => s.result === "imported") ? "imported" : "unchanged", statements };
}
