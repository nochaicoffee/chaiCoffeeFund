import { formatDate } from "./date";
import type { AccountSyncProblem, EmailOutcome, OpenedReview } from "../accountStatementIngestion/types";

/**
 * What the Sync account statements report shows, built from every round's outcomes: which statements
 * were added, which were already in the Sheet, which disagreed with a recorded balance (and so need
 * an answer), and which couldn't be used, with why and what to change. One row per statement, as one
 * email can hold several accounts' (HDFC's combined one).
 */

export interface AccountSyncRow {
  messageId: string;
  account?: string;
  /** "Sep 1, 2026 to Sep 30, 2026". */
  period?: string;
  subject: string;
  added: number;
  alreadyThere: number;
  /** Income entries the statement gave (#187). */
  income: number;
}

export interface AccountSyncFailedRow {
  messageId: string;
  title: string;
  reason: string;
  fix?: string;
}

export interface AccountSyncReviewRow extends OpenedReview {
  messageId: string;
  account: string;
}

export interface AccountSyncReport {
  emails: number;
  imported: AccountSyncRow[];
  alreadyIn: AccountSyncRow[];
  /** Balances left as recorded because the statement said otherwise. */
  reviews: AccountSyncReviewRow[];
  failed: AccountSyncFailedRow[];
  /** The accounts whose last 4 this sync read from a statement and saved. */
  filledLast4: string[];
  /** New emails still to read, when the sync stopped before reaching them. */
  remaining: number;
  /** Income entries added across every statement (#187). */
  income: number;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return trimmed;
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

/** What to change so the next sync can use it. Only what's fixed in the app; the rest is simply tried again. */
export function accountFixFor(problem: AccountSyncProblem | undefined): string | undefined {
  switch (problem) {
    case "locked":
      return "Save the account's statement PDF password in Edit account.";
    case "no-account":
      return "Add the account, or fill in its bank name and last 4 digits in Edit account.";
    case "several-accounts":
      return "Give each of those accounts its own last 4 digits in Edit account.";
    case "closed-account":
      return "Reopen the account to import its statements.";
    case "before-account-opened":
      return "Check the account's opened-on date in Edit account.";
    default:
      return undefined;
  }
}

const period = (from?: string, to?: string) => (from && to ? `${formatDate(from)} to ${formatDate(to)}` : undefined);

export function buildAccountSyncReport(outcomes: EmailOutcome[], remaining: number): AccountSyncReport {
  const imported: AccountSyncRow[] = [];
  const alreadyIn: AccountSyncRow[] = [];
  const reviews: AccountSyncReviewRow[] = [];
  const failed: AccountSyncFailedRow[] = [];
  const filled: string[] = [];
  for (const email of outcomes) {
    if (email.statements.length === 0) {
      failed.push({ messageId: email.messageId, title: email.subject || "A statement email", reason: sentence(email.reason ?? "it couldn't be read"), ...(accountFixFor(email.problem) && { fix: accountFixFor(email.problem) }) });
      continue;
    }
    for (const s of email.statements) {
      const title = [s.accountName ?? s.bank, period(s.periodStart, s.periodEnd)].filter(Boolean).join(" · ") || email.subject;
      if (s.result === "skipped") {
        failed.push({ messageId: email.messageId, title, reason: sentence(s.reason ?? "it couldn't be used"), ...(accountFixFor(s.problem) && { fix: accountFixFor(s.problem) }) });
        continue;
      }
      const row: AccountSyncRow = { messageId: email.messageId, account: s.accountName, period: period(s.periodStart, s.periodEnd), subject: email.subject, added: s.created, alreadyThere: s.unchanged, income: s.income ?? 0 };
      (s.result === "imported" ? imported : alreadyIn).push(row);
      for (const r of s.reviews) reviews.push({ ...r, messageId: email.messageId, account: s.accountName ?? "Account" });
      if (s.notes.some((n) => n.startsWith("filled in")) && s.accountName) filled.push(s.accountName);
    }
  }
  return { emails: outcomes.length, imported, alreadyIn, reviews, failed, filledLast4: [...new Set(filled)], remaining, income: imported.reduce((t, r) => t + r.income, 0) };
}
