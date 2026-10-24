import "server-only";
import type { gmail_v1 } from "googleapis";
import { getAccountStatementLabel, getGmailClient } from "@/lib/gmail/client";
import { downloadAttachment, getHeader, getMessage, listMessagesWithLabel, listPdfParts } from "@/lib/gmail/messages";
import { decryptAndExtractText } from "@/lib/pdf/decryptAndExtractText";
import { parseAccountStatements } from "@/lib/accountStatementParsing";
import type { ParseResult } from "@/lib/accountStatementParsing/types";
import type { ReviewRecord } from "@/lib/aggregate/statementBalances";
import { todayIso } from "@/lib/format/date";
import { accountsRepository } from "@/lib/sheets/accounts";
import { accountStatementEmailsRepository } from "@/lib/sheets/accountStatementEmails";
import { balanceReviewsRepository } from "@/lib/sheets/balanceReviews";
import { balanceSnapshotsRepository } from "@/lib/sheets/balanceSnapshots";
import { syncRunsRepository } from "@/lib/sheets/syncRuns";
import type { Account, BalanceReview, BalanceSnapshot, SyncTrigger } from "@/lib/sheets/types";
import { decideSyncTurn } from "@/lib/statementIngestion/syncTurn";
import { withTimeout } from "@/lib/statementIngestion/withTimeout";
import { accountLogEntry, planAccountEmails } from "./emailLog";
import { planStatement, summarizeEmail } from "./planStatements";
import type { AccountSyncResult, EmailOutcome, StatementOutcome } from "./types";

/** A sync stops starting new emails after this long, inside the route's maxDuration (60s). */
const TIME_BUDGET_MS = 45_000;
/** One email that takes longer is logged as failed and left for the next sync. */
const EMAIL_TIMEOUT_MS = 20_000;
/** A scheduled sync tries a failed email again only after this long (see planAccountEmails). */
const RETRY_FAILED_AFTER_MS = 24 * 60 * 60 * 1000;

export interface AccountSyncOptions {
  trigger: SyncTrigger;
  /** Read and plan everything, write nothing: no balances, reviews, log or run rows. */
  dryRun?: boolean;
  timeBudgetMs?: number;
  emailTimeoutMs?: number;
  /** The clock, for tests. */
  now?: () => Date;
}

/**
 * The bank account statement sync, the twin of runStatementIngestion for cards. It reads the emails the
 * AccountStatementEmails log says are still to do, plans each statement's balances against what's recorded
 * (planStatements.ts), and writes them all at the end in a few requests: balances, then reviews, then the log,
 * so an email is never logged done without its balances. A sync that dies before the end logs nothing and the
 * next one reads those emails again. Reads and writes the repositories directly, never `cached.ts`.
 *
 * What it never does: change a recorded balance. A statement that disagrees with one opens a review (BalanceReviews)
 * and the recorded balance stays until it's answered.
 */
export async function runAccountStatementSync({ trigger, dryRun = false, timeBudgetMs = TIME_BUDGET_MS, emailTimeoutMs = EMAIL_TIMEOUT_MS, now = () => new Date() }: AccountSyncOptions): Promise<AccountSyncResult> {
  const startedAt = now();
  let runId: string | undefined;
  if (!dryRun) {
    const run = await syncRunsRepository.create({ kind: "Accounts", trigger, status: "Running", startedAt: startedAt.toISOString() });
    runId = run.id;
    const turn = decideSyncTurn(await syncRunsRepository.list(), run.id, startedAt.getTime());
    if (!turn.goAhead) {
      await syncRunsRepository
        .update(run.id, { status: "Skipped", finishedAt: now().toISOString(), details: `Another account sync was already running, started ${turn.runningSince}` })
        .catch((error) => warn("couldn't mark this sync as skipped", error));
      return { status: "already-running", runningSince: turn.runningSince };
    }
    if (turn.stale.length > 0) {
      await syncRunsRepository
        .updateMany(turn.stale.map((stale) => ({ id: stale.id, patch: { status: "Failed" as const, details: "Stopped before it finished, probably cut off by a time limit" } })))
        .catch((error) => warn(`couldn't mark ${turn.stale.length} stopped syncs as failed`, error));
    }
  }

  let result: Extract<AccountSyncResult, { status: "done" }>;
  try {
    result = await syncEmails({ startedAt: startedAt.getTime(), timeBudgetMs, emailTimeoutMs, now, dryRun, trigger });
  } catch (error) {
    if (runId) {
      const message = error instanceof Error ? error.message : String(error);
      await syncRunsRepository.update(runId, { status: "Failed", finishedAt: now().toISOString(), details: message }).catch((e) => warn("couldn't mark this sync as failed", e));
    }
    throw error;
  }
  if (runId) {
    const count = (outcome: EmailOutcome["result"]) => result.outcomes.filter((o) => o.result === outcome).length;
    await syncRunsRepository
      .update(runId, { status: "Done", finishedAt: now().toISOString(), imported: count("imported"), duplicates: count("unchanged"), failed: count("skipped"), remaining: result.remaining })
      .catch((error) => warn("couldn't mark this sync as done", error));
  }
  return result;
}

function warn(what: string, error: unknown) {
  console.warn(`[account-sync] ${what}:`, error instanceof Error ? error.message : error);
}

/** Everything one sync plans, held until the end so it is written in a few requests. */
interface Pending {
  snapshots: { tempId: string; accountId: string; date: string; balance: number }[];
  reviews: { tempId: string; input: Omit<BalanceReview, "id" | "createdAt"> }[];
  supersede: Set<string>;
  last4: { accountId: string; last4: string; outcome: StatementOutcome }[];
}

interface Working {
  accounts: Account[];
  snapshots: BalanceSnapshot[];
  reviews: ReviewRecord[];
  pending: Pending;
  seq: number;
}

async function syncEmails(o: { startedAt: number; timeBudgetMs: number; emailTimeoutMs: number; now: () => Date; dryRun: boolean; trigger: SyncTrigger }): Promise<Extract<AccountSyncResult, { status: "done" }>> {
  const gmail = getGmailClient();
  const [accountRows, snapshotRows, reviewRows, log, messageRefs] = await Promise.all([
    accountsRepository.readAll(),
    balanceSnapshotsRepository.readAll(),
    balanceReviewsRepository.readAll(),
    accountStatementEmailsRepository.list(),
    listMessagesWithLabel(gmail, getAccountStatementLabel()),
  ]);

  const working: Working = {
    accounts: accountRows.records.map((a) => ({ ...a })),
    snapshots: [...snapshotRows.records],
    reviews: reviewRows.records.map((r) => ({ id: r.id, accountId: r.accountId, date: r.date, statementBalance: r.statementBalance, status: r.status })),
    pending: { snapshots: [], reviews: [], supersede: new Set(), last4: [] },
    seq: 0,
  };
  // Passwords from invalid account rows too, so their statements still open and are reported as what they are.
  const passwords = [
    ...new Set([...accountRows.records.map((a) => a.statementPdfPassword), ...accountRows.invalid.map((row) => row.values.statementPdfPassword)].filter((p): p is string => typeof p === "string" && p !== "")),
  ];

  // An unattended run leaves out emails that failed within the last day; the button retries every one.
  const skipFailedSince = o.trigger === "Scheduled" ? new Date(o.now().getTime() - RETRY_FAILED_AFTER_MS).toISOString() : undefined;
  const planned = planAccountEmails(messageRefs.map((ref) => ref.id), log, { skipFailedSince });
  const read: { outcome: EmailOutcome; logged: (typeof planned)[number]["logged"] }[] = [];
  for (const { messageId, logged } of planned) {
    // Always at least one, so every sync gets somewhere.
    if (read.length > 0 && o.now().getTime() - o.startedAt >= o.timeBudgetMs) break;
    const outcome = await withTimeout<EmailOutcome>(
      (signal) => processEmailSafely(gmail, messageId, working, passwords, todayIso(o.now()), signal),
      o.emailTimeoutMs,
      () => ({ messageId, subject: "", result: "skipped", problem: "timeout", reason: `took over ${o.emailTimeoutMs / 1000}s to read, so it was left for the next sync`, statements: [] }),
    );
    read.push({ outcome, logged });
  }

  const remaining = planned.slice(read.length).filter((email) => !email.logged).length;
  if (!o.dryRun) await writeAll(working, read, o.now);
  return { status: "done", outcomes: read.map((r) => r.outcome), remaining, dryRun: o.dryRun };
}

/** Balances first, then reviews, then the log: an email is never logged done without its balances. */
async function writeAll(working: Working, read: { outcome: EmailOutcome; logged: Parameters<typeof accountLogEntry>[1] }[], now: () => Date) {
  const { pending } = working;
  const timestamp = () => now().toISOString().replace(/\.\d{3}Z$/, "Z");

  const created = pending.snapshots.length > 0 ? await balanceSnapshotsRepository.createMany(pending.snapshots.map(({ accountId, date, balance }) => ({ accountId, date, balance, source: "Statement" as const }))) : [];
  const realId = new Map(pending.snapshots.map((s, i) => [s.tempId, created[i].id]));

  if (pending.reviews.length > 0) {
    await balanceReviewsRepository.createMany(pending.reviews.map(({ input }) => ({ ...input, snapshotId: realId.get(input.snapshotId) ?? input.snapshotId, createdAt: timestamp() })));
  }
  if (pending.supersede.size > 0) {
    await balanceReviewsRepository.updateMany([...pending.supersede].map((id) => ({ id, patch: { status: "Superseded" as const, resolvedAt: timestamp() } })));
  }
  // A failed save is only noted: the balances themselves are in.
  for (const { accountId, last4, outcome } of pending.last4) {
    await accountsRepository.update(accountId, { last4 }).catch((error) => {
      outcome.notes = outcome.notes.map((n) => (n.startsWith("filled in") ? `couldn't save the account's last 4 (${last4}): ${error instanceof Error ? error.message : String(error)}` : n));
    });
  }

  const triedAt = timestamp();
  const entries = read.map(({ outcome, logged }) => ({ logged, entry: accountLogEntry(outcome, logged, triedAt) }));
  const fresh = entries.filter((e) => !e.logged);
  const retried = entries.flatMap((e) => (e.logged ? [{ id: e.logged.id, patch: e.entry }] : []));
  if (fresh.length > 0) await accountStatementEmailsRepository.createMany(fresh.map((e) => e.entry));
  if (retried.length > 0) await accountStatementEmailsRepository.updateMany(retried);
}

async function processEmailSafely(gmail: gmail_v1.Gmail, messageId: string, working: Working, passwords: string[], today: string, signal: AbortSignal): Promise<EmailOutcome> {
  try {
    return await processEmail(gmail, messageId, working, passwords, today, signal);
  } catch (error) {
    // One bad email (network, an unexpected Sheets error) never aborts the run: it is reported and retried next time.
    return { messageId, subject: "", result: "skipped", problem: "error", reason: error instanceof Error ? error.message : String(error), statements: [] };
  }
}

const REASONS = {
  "no-pdf": "no PDF attachment found",
  locked: "none of the saved account PDF passwords opens it",
  "no-text": "the PDF has no text to read, so it may be a scanned image",
  "unknown-layout": "this isn't a layout the import reads (HDFC, Slice or Jupiter)",
} as const;

async function processEmail(gmail: gmail_v1.Gmail, messageId: string, working: Working, passwords: string[], today: string, signal: AbortSignal): Promise<EmailOutcome> {
  const message = await getMessage(gmail, messageId);
  // internalDate is when Gmail received it, in milliseconds; the date is taken in the app's time zone.
  const receivedDate = message.internalDate ? todayIso(new Date(Number(message.internalDate))) : undefined;
  const base = { messageId, subject: getHeader(message, "Subject"), ...(receivedDate && { receivedDate }) };

  const parts = listPdfParts(message);
  if (parts.length === 0) return { ...base, result: "skipped", problem: "no-pdf", reason: REASONS["no-pdf"], statements: [] };

  // The first PDF that opens and is a statement; the rest (a terms leaflet, say) are passed over.
  let results: ParseResult[] | null = null;
  let locked = false;
  let noText = false;
  for (const part of parts) {
    const bytes = await downloadAttachment(gmail, messageId, part.attachmentId);
    if (!bytes) continue;
    const opened = await decryptAndExtractText(bytes, passwords);
    if ("failure" in opened) {
      if (opened.failure === "no_password_matched") locked = true;
      else noText = true;
      continue;
    }
    results = parseAccountStatements(opened.text);
    if (results) break;
  }
  if (!results) {
    // A locked PDF is the thing to fix first, then one with no text; otherwise none was a statement.
    const problem = locked ? "locked" : noText ? "no-text" : "unknown-layout";
    return { ...base, result: "skipped", problem, reason: REASONS[problem], statements: [] };
  }

  // Given up on (withTimeout): change nothing.
  if (signal.aborted) return { ...base, result: "skipped", problem: "timeout", reason: "given up on", statements: [] };

  const statements: StatementOutcome[] = [];
  for (const read of results) {
    const plan = planStatement(read, { accounts: working.accounts, snapshots: working.snapshots, reviews: working.reviews, today, singleStatement: results.length === 1 });
    applyToWorking(working, plan.writes, plan.outcome, messageId);
    statements.push(plan.outcome);
  }
  return summarizeEmail(base, statements);
}

/** Counts a plan's writes as done, so the emails after it see them (a monthly after the range that holds it). */
function applyToWorking(working: Working, writes: ReturnType<typeof planStatement>["writes"], outcome: StatementOutcome, messageId: string) {
  const { pending } = working;
  for (const c of writes.creates) {
    const tempId = `pending-snapshot-${working.seq++}`;
    pending.snapshots.push({ tempId, accountId: outcome.accountId!, date: c.date, balance: c.balance });
    working.snapshots.push({ id: tempId, accountId: outcome.accountId!, date: c.date, balance: c.balance, source: "Statement" });
  }
  for (const id of writes.supersede) {
    const i = pending.reviews.findIndex((r) => r.tempId === id);
    // A review opened earlier in this very sync is dropped, not written and then superseded.
    if (i >= 0) pending.reviews.splice(i, 1);
    else pending.supersede.add(id);
    const known = working.reviews.find((r) => r.id === id);
    if (known) known.status = "Superseded";
  }
  for (const m of writes.reviews) {
    const tempId = `pending-review-${working.seq++}`;
    pending.reviews.push({
      tempId,
      input: { accountId: outcome.accountId!, date: m.date, snapshotId: m.snapshotId, recordedBalance: m.recordedBalance, statementBalance: m.balance, messageId, status: "Open" },
    });
    working.reviews.push({ id: tempId, accountId: outcome.accountId!, date: m.date, statementBalance: m.balance, status: "Open" });
  }
  if (writes.fillLast4) {
    pending.last4.push({ ...writes.fillLast4, outcome });
    const account = working.accounts.find((a) => a.id === writes.fillLast4!.accountId);
    if (account) account.last4 = writes.fillLast4.last4;
  }
}
