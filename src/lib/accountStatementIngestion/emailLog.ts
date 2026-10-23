import type { AccountStatementEmail } from "../sheets/types";
import type { EmailOutcome } from "./types";

/** An email a sync is going to read, with its AccountStatementEmails row if it has one. */
export interface PlannedAccountEmail {
  messageId: string;
  logged?: AccountStatementEmail;
}

/**
 * Which labelled emails a sync reads, going by the AccountStatementEmails log. One logged as
 * Imported or Duplicate is done; Failed ones are tried again. Emails never seen come first, newest
 * first as Gmail lists them, so a sync that runs out of time has spent it on new statements rather
 * than on retrying old failures. To read a done email again (say an account was added since), delete
 * its row from the tab.
 */
export function planAccountEmails(messageIds: string[], log: AccountStatementEmail[]): PlannedAccountEmail[] {
  const byMessage = new Map<string, AccountStatementEmail>();
  // The first row wins if an email was ever logged twice.
  for (const row of log) if (!byMessage.has(row.messageId)) byMessage.set(row.messageId, row);

  const fresh: PlannedAccountEmail[] = [];
  const retry: PlannedAccountEmail[] = [];
  for (const messageId of new Set(messageIds)) {
    const logged = byMessage.get(messageId);
    if (!logged) fresh.push({ messageId });
    else if (logged.result === "Failed") retry.push({ messageId, logged });
  }
  return [...fresh, ...retry];
}

const RESULTS = { imported: "Imported", unchanged: "Duplicate", skipped: "Failed" } as const;

/**
 * An email's log row after this sync read it. Every field is set, blanks as undefined, so writing it
 * over an existing row also clears what no longer applies, like the reason an email failed last time.
 * The details are dates and counts and reasons, never amounts, as the tab is read in the Sheet.
 */
export function accountLogEntry(outcome: EmailOutcome, logged: AccountStatementEmail | undefined, triedAt: string): Omit<AccountStatementEmail, "id"> {
  const used = outcome.statements.filter((s) => s.result !== "skipped");
  const first = used[0] ?? outcome.statements[0];
  const lines = outcome.statements.map((s) => {
    const who = s.accountName ?? s.bank ?? "statement";
    if (s.result === "skipped") return `${who}: skipped, ${s.reason}`;
    const parts = [`${s.created} added`, `${s.unchanged} already there`];
    if (s.reviews.length > 0) parts.push(`${s.reviews.length} to review (${s.reviews.map((r) => r.date).join(", ")})`);
    return `${who}: ${parts.join(", ")}${s.notes.length > 0 ? `; ${s.notes.join("; ")}` : ""}`;
  });
  return {
    messageId: outcome.messageId,
    // An email that couldn't be read this time keeps what an earlier sync found.
    receivedDate: outcome.receivedDate ?? logged?.receivedDate,
    subject: outcome.subject || logged?.subject,
    accountId: used.length === 1 ? used[0].accountId : used.length > 1 ? undefined : first?.accountId,
    periodStart: first?.periodStart,
    periodEnd: first?.periodEnd,
    result: RESULTS[outcome.result],
    details: outcome.reason ?? (lines.length > 0 ? lines.join(" | ") : undefined),
    attempts: (logged?.attempts ?? 0) + 1,
    lastTriedAt: triedAt,
  };
}
