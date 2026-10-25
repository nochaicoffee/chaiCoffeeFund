import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { Account, AccountStatementEmail, BalanceReview, BalanceSnapshot, IncomeEntry, IncomeSource, SyncRun } from "../sheets/types";

/**
 * The account statement sync with Gmail, the PDF reader and the Sheets repositories faked. Each fake email carries
 * the statement its PDF "contains" (a ParseResult, or a PDF failure). The tabs are kept in memory, so a second sync
 * sees the first's writes. The planning is tested on its own in planStatements.test.ts; this is the reading, the
 * order of the writes and what survives a second run.
 */
type FakeEmail = { id: string; subject?: string; parse?: unknown[]; failure?: string; noPdf?: boolean; hangs?: boolean; throws?: boolean };
const fake = vi.hoisted(() => ({
  emails: [] as FakeEmail[],
  accounts: [] as Account[],
  snapshots: [] as BalanceSnapshot[],
  reviews: [] as BalanceReview[],
  log: [] as AccountStatementEmail[],
  runs: [] as SyncRun[],
  writes: [] as string[],
  accountUpdates: [] as { id: string; patch: Partial<Account> }[],
  incomeSources: [] as IncomeSource[],
  incomeEntries: [] as IncomeEntry[],
  failReviewWrite: false,
  nextId: 0,
}));

vi.mock("@/lib/gmail/client", () => ({ getGmailClient: () => ({}), getAccountStatementLabel: () => "BankAccountStatements" }));
vi.mock("@/lib/gmail/messages", () => ({
  listMessagesWithLabel: async () => fake.emails.map((e) => ({ id: e.id })),
  // 1792368000000 is 00:00 on 2026-10-19 UTC, and 05:30 that day in India.
  getMessage: async (_gmail: unknown, id: string) => ({ id, internalDate: "1792368000000" }),
  getHeader: (message: { id: string }) => fake.emails.find((e) => e.id === message.id)!.subject ?? "A statement",
  listPdfParts: (message: { id: string }) => (fake.emails.find((e) => e.id === message.id)!.noPdf ? [] : [{ filename: "s.pdf", attachmentId: message.id, size: 1 }]),
  downloadAttachment: async (_gmail: unknown, _messageId: string, attachmentId: string) => new TextEncoder().encode(attachmentId),
}));
vi.mock("@/lib/pdf/decryptAndExtractText", () => ({
  decryptAndExtractText: async (bytes: Uint8Array) => {
    const email = fake.emails.find((e) => e.id === new TextDecoder().decode(bytes))!;
    if (email.hangs) await new Promise(() => {});
    if (email.throws) throw new Error("pdf.js fell over");
    if (email.failure) return { failure: email.failure };
    return { text: email.id, passwordUsed: null };
  },
}));
vi.mock("@/lib/accountStatementParsing", () => ({
  parseAccountStatements: (text: string) => fake.emails.find((e) => e.id === text)!.parse ?? null,
}));
vi.mock("@/lib/sheets/accounts", () => ({
  accountsRepository: {
    readAll: async () => ({ records: fake.accounts, invalid: [] }),
    update: async (id: string, patch: Partial<Account>) => {
      fake.writes.push("accounts.update");
      fake.accountUpdates.push({ id, patch });
      return Object.assign(fake.accounts.find((a) => a.id === id)!, patch);
    },
  },
}));
vi.mock("@/lib/sheets/balanceSnapshots", () => ({
  balanceSnapshotsRepository: {
    readAll: async () => ({ records: fake.snapshots, invalid: [] }),
    createMany: async (inputs: Omit<BalanceSnapshot, "id">[]) => {
      fake.writes.push("snapshots.createMany");
      const rows = inputs.map((input) => ({ ...input, id: `snap${++fake.nextId}` }));
      fake.snapshots.push(...rows);
      return rows;
    },
  },
}));
vi.mock("@/lib/sheets/balanceReviews", () => ({
  balanceReviewsRepository: {
    readAll: async () => ({ records: fake.reviews, invalid: [] }),
    createMany: async (inputs: Omit<BalanceReview, "id">[]) => {
      if (fake.failReviewWrite) throw new Error("Sheets said no");
      fake.writes.push("reviews.createMany");
      const rows = inputs.map((input) => ({ ...input, id: `rev${++fake.nextId}` }));
      fake.reviews.push(...rows);
      return rows;
    },
    updateMany: async (changes: { id: string; patch: Partial<BalanceReview> }[]) => {
      fake.writes.push("reviews.updateMany");
      return changes.map(({ id, patch }) => Object.assign(fake.reviews.find((r) => r.id === id)!, patch));
    },
  },
}));
vi.mock("@/lib/sheets/accountStatementEmails", () => ({
  accountStatementEmailsRepository: {
    list: async () => fake.log,
    createMany: async (inputs: Omit<AccountStatementEmail, "id">[]) => {
      fake.writes.push("log.createMany");
      const rows = inputs.map((input) => ({ ...input, id: `log${++fake.nextId}` }));
      fake.log.push(...rows);
      return rows;
    },
    updateMany: async (changes: { id: string; patch: Partial<AccountStatementEmail> }[]) => {
      if (changes.length > 0) fake.writes.push("log.updateMany");
      return changes.map(({ id, patch }) => Object.assign(fake.log.find((r) => r.id === id)!, patch));
    },
  },
}));
vi.mock("@/lib/sheets/incomeSources", () => ({ incomeSourcesRepository: { list: async () => fake.incomeSources } }));
vi.mock("@/lib/sheets/incomeEntries", () => ({
  incomeEntriesRepository: {
    list: async () => fake.incomeEntries,
    createMany: async (inputs: Omit<IncomeEntry, "id">[]) => {
      fake.writes.push("income.createMany");
      const rows = inputs.map((input) => ({ ...input, id: `inc${++fake.nextId}` }));
      fake.incomeEntries.push(...rows);
      return rows;
    },
  },
}));
vi.mock("@/lib/sheets/syncRuns", () => ({
  syncRunsRepository: {
    create: async (input: Omit<SyncRun, "id">) => {
      const run = { ...input, id: `run${++fake.nextId}` };
      fake.runs.push(run);
      return run;
    },
    list: async () => fake.runs,
    update: async (id: string, patch: Partial<SyncRun>) => Object.assign(fake.runs.find((r) => r.id === id)!, patch),
    updateMany: async (changes: { id: string; patch: Partial<SyncRun> }[]) => changes.map(({ id, patch }) => Object.assign(fake.runs.find((r) => r.id === id)!, patch)),
  },
}));

const { runAccountStatementSync } = await import("./run");

const slice = (overrides: Partial<Account> = {}): Account => ({ id: "slice", name: "Slice Bank Account", bank: "slice small finance bank", accountType: "Savings", purpose: "Spending", startDate: "2025-01-01", status: "Active", last4: "1128", statementPdfPassword: "pw", ...overrides });
const statement = (periodStart: string, periodEnd: string, opening: number, movements: [string, number][], last4 = "1128") => {
  let running = Math.round(opening * 100);
  const rows = movements.map(([date, amount]) => {
    running += Math.round(amount * 100);
    return { date, amount, balance: running / 100 };
  });
  return [{ ok: true, parsed: { bank: "Slice", accountLast4: last4, statement: { periodStart, periodEnd, openingBalance: opening, closingBalance: running / 100, rows } } }];
};
const AUG = () => statement("2026-08-01", "2026-08-31", 1000, [["2026-08-05", -200]]); // opening 1000 on Jul 31, closing 800 on Aug 31
const snap = (id: string, date: string, balance: number): BalanceSnapshot => ({ id, accountId: "slice", date, balance });

async function sync(options: Partial<Parameters<typeof runAccountStatementSync>[0]> = {}) {
  const result = await runAccountStatementSync({ trigger: "Manual", now: () => new Date("2026-10-23T06:00:00Z"), ...options });
  if (result.status !== "done") throw new Error(`expected the sync to run, but it was ${result.status}`);
  return result;
}

beforeEach(() => {
  fake.emails = [];
  fake.accounts = [slice()];
  fake.snapshots = [];
  fake.reviews = [];
  fake.log = [];
  fake.runs = [];
  fake.writes = [];
  fake.accountUpdates = [];
  fake.incomeSources = [];
  fake.incomeEntries = [];
  fake.failReviewWrite = false;
  fake.nextId = 0;
});

describe("income from statements (#187)", () => {
  const salary: IncomeSource = { id: "sal", name: "NetApp Salary", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 138500, status: "Active", scheduleDate: "2026-01-01", statementMatch: "NETAPP" };
  const withSalary = () => {
    const [read] = statement("2026-09-01", "2026-09-30", 1000, [["2026-09-01", 138500], ["2026-09-05", -200]]) as { parsed: { statement: { rows: { narration?: string }[] } } }[];
    read.parsed.statement.rows[0].narration = "NEFT CR NETAPP INDIA";
    read.parsed.statement.rows[1].narration = "UPI SHOP";
    return [read];
  };

  it("records a matching deposit as received income, before the email is logged", async () => {
    fake.incomeSources = [salary];
    fake.emails = [{ id: "sep", parse: withSalary() }];
    const result = await sync();
    expect(result.outcomes[0].statements[0]).toMatchObject({ result: "imported", income: 1 });
    expect(fake.incomeEntries).toEqual([expect.objectContaining({ incomeSourceId: "sal", receivedDate: "2026-09-01", expectedDate: "2026-09-01", amount: 138500, accountId: "slice", tag: "Regular", origin: "Statement" })]);
    expect(fake.writes).toEqual(["snapshots.createMany", "income.createMany", "log.createMany"]);
    expect(fake.log[0].details).toContain("1 income");
  });

  it("adds nothing when the statement is read again", async () => {
    fake.incomeSources = [salary];
    fake.emails = [{ id: "sep", parse: withSalary() }];
    await sync();
    const again = await sync({ reread: true });
    expect(again.outcomes[0].statements[0]).toMatchObject({ result: "unchanged", income: 0 });
    expect(fake.incomeEntries).toHaveLength(1);
  });

  it("reads done emails again with reread, so statements read before income matching give their income", async () => {
    fake.emails = [{ id: "sep", parse: withSalary() }];
    await sync();
    expect(fake.incomeEntries).toEqual([]);
    expect((await sync()).outcomes).toEqual([]);
    fake.incomeSources = [salary];
    const caughtUp = await sync({ reread: true });
    expect(caughtUp.outcomes[0].statements[0]).toMatchObject({ income: 1, created: 0, unchanged: 2 });
    expect(fake.incomeEntries).toHaveLength(1);
    expect(fake.log).toHaveLength(1);
  });

  it("counts done emails as still to read when a reread runs out of time", async () => {
    fake.incomeSources = [salary];
    fake.emails = [{ id: "sep", parse: withSalary() }, { id: "aug", parse: AUG() }];
    await sync();
    let tick = 0;
    const slow = await sync({ reread: true, timeBudgetMs: 1, now: () => new Date(Date.parse("2026-10-23T06:00:00Z") + tick++ * 1000) });
    expect(slow.outcomes).toHaveLength(1);
    expect(slow.remaining).toBe(1);
  });

  it("writes nothing on a dry run", async () => {
    fake.incomeSources = [salary];
    fake.emails = [{ id: "sep", parse: withSalary() }];
    const result = await sync({ dryRun: true });
    expect(result.outcomes[0].statements[0].income).toBe(1);
    expect(fake.incomeEntries).toEqual([]);
  });
});

describe("runAccountStatementSync", () => {
  it("writes the statement's balances as Statement-sourced rows, then logs the email, in that order", async () => {
    fake.emails = [{ id: "aug", parse: AUG() }];
    const result = await sync();
    expect(result.outcomes[0]).toMatchObject({ result: "imported", statements: [{ created: 2, accountName: "Slice Bank Account" }] });
    expect(fake.snapshots.map((s) => [s.date, s.balance, s.source])).toEqual([
      ["2026-07-31", 1000, "Statement"],
      ["2026-08-31", 800, "Statement"],
    ]);
    expect(fake.writes).toEqual(["snapshots.createMany", "log.createMany"]);
    expect(fake.log[0]).toMatchObject({ messageId: "aug", result: "Imported", accountId: "slice", periodStart: "2026-08-01", periodEnd: "2026-08-31", receivedDate: "2026-10-19", attempts: 1 });
  });

  it("a second sync reads nothing: the email is done", async () => {
    fake.emails = [{ id: "aug", parse: AUG() }];
    await sync();
    fake.writes = [];
    const again = await sync();
    expect(again.outcomes).toEqual([]);
    expect(fake.writes).toEqual([]);
    expect(fake.snapshots).toHaveLength(2);
  });

  it("an email re-read after its log row was deleted finds everything already there and adds nothing", async () => {
    fake.emails = [{ id: "aug", parse: AUG() }];
    await sync();
    fake.log = [];
    const again = await sync();
    expect(again.outcomes[0]).toMatchObject({ result: "unchanged", statements: [{ created: 0, unchanged: 2 }] });
    expect(fake.snapshots).toHaveLength(2);
    expect(fake.log[0].result).toBe("Duplicate");
  });

  it("leaves a recorded balance alone when the statement disagrees, and opens a review pointing at it", async () => {
    fake.snapshots = [snap("keep", "2026-08-31", 790)];
    fake.emails = [{ id: "aug", parse: AUG() }];
    const result = await sync();
    expect(fake.snapshots.find((s) => s.id === "keep")!.balance).toBe(790);
    expect(fake.reviews).toHaveLength(1);
    expect(fake.reviews[0]).toMatchObject({ accountId: "slice", date: "2026-08-31", snapshotId: "keep", recordedBalance: 790, statementBalance: 800, status: "Open", messageId: "aug" });
    expect(result.outcomes[0].statements[0].reviews).toEqual([{ date: "2026-08-31", recordedBalance: 790, statementBalance: 800, bigDrop: false }]);
    expect(fake.writes).toEqual(["snapshots.createMany", "reviews.createMany", "log.createMany"]);
  });

  it("does not open the same review again when the email is read again", async () => {
    fake.snapshots = [snap("keep", "2026-08-31", 790)];
    fake.emails = [{ id: "aug", parse: AUG() }];
    await sync();
    fake.log = [];
    await sync();
    expect(fake.reviews).toHaveLength(1);
  });

  it("an overlapping monthly after a range: the review it opens points at the balance the range created in the same sync", async () => {
    const range = statement("2026-01-01", "2026-08-31", 100, [["2026-02-01", 700]]); // 800 on Aug 31
    const monthly = statement("2026-08-01", "2026-08-31", 1000, [["2026-08-05", -190]]); // 810 on Aug 31: disagrees
    fake.emails = [{ id: "monthly", parse: monthly }, { id: "range", parse: range }];
    // Gmail lists newest first, so the monthly is read first; put the range ahead of it as the older, bigger email.
    fake.emails = [{ id: "range", parse: range }, { id: "monthly", parse: monthly }];
    await sync();
    const aug31 = fake.snapshots.find((s) => s.date === "2026-08-31")!;
    expect(aug31.balance).toBe(800);
    expect(fake.reviews).toHaveLength(1);
    expect(fake.reviews[0].snapshotId).toBe(aug31.id);
    expect(fake.reviews[0]).toMatchObject({ recordedBalance: 800, statementBalance: 810 });
  });

  it("a locked PDF is logged as Failed with the reason, and tried again next sync", async () => {
    fake.emails = [{ id: "locked", failure: "no_password_matched" }];
    const first = await sync();
    expect(first.outcomes[0]).toMatchObject({ result: "skipped", problem: "locked", reason: "none of the saved account PDF passwords opens it" });
    expect(fake.log[0]).toMatchObject({ result: "Failed", attempts: 1 });
    fake.emails = [{ id: "locked", parse: AUG() }];
    const second = await sync();
    expect(second.outcomes[0].result).toBe("imported");
    expect(fake.log).toHaveLength(1);
    expect(fake.log[0]).toMatchObject({ result: "Imported", attempts: 2 });
  });

  it("a scheduled sync leaves a failure from the last day alone, and the button tries it again", async () => {
    fake.emails = [{ id: "locked", failure: "no_password_matched" }];
    await sync({ now: () => new Date("2026-10-23T06:00:00Z") });
    expect(fake.log[0]).toMatchObject({ result: "Failed", attempts: 1 });
    const scheduled = await sync({ trigger: "Scheduled", now: () => new Date("2026-10-23T18:00:00Z") });
    expect(scheduled.outcomes).toEqual([]);
    expect(fake.log[0].attempts).toBe(1);
    const nextDay = await sync({ trigger: "Scheduled", now: () => new Date("2026-10-24T07:00:00Z") });
    expect(nextDay.outcomes).toHaveLength(1);
    expect(fake.log[0].attempts).toBe(2);
    const manual = await sync({ now: () => new Date("2026-10-24T07:05:00Z") });
    expect(manual.outcomes).toHaveLength(1);
    expect(fake.log[0].attempts).toBe(3);
  });

  it("reports an email with no PDF, a PDF with no text, and one that is not a layout it reads", async () => {
    fake.emails = [{ id: "a", noPdf: true }, { id: "b", failure: "no_text_extracted" }, { id: "c" }];
    const result = await sync();
    expect(result.outcomes.map((o) => o.problem)).toEqual(["no-pdf", "no-text", "unknown-layout"]);
  });

  it("one email that throws is reported and does not stop the rest", async () => {
    fake.emails = [{ id: "boom", throws: true }, { id: "aug", parse: AUG() }];
    const result = await sync();
    expect(result.outcomes.map((o) => o.result)).toEqual(["skipped", "imported"]);
    expect(result.outcomes[0]).toMatchObject({ problem: "error", reason: "pdf.js fell over" });
  });

  it("gives up on an email that hangs, adds nothing from it, and carries on", async () => {
    fake.emails = [{ id: "slow", hangs: true }, { id: "aug", parse: AUG() }];
    const result = await sync({ emailTimeoutMs: 20 });
    expect(result.outcomes[0]).toMatchObject({ problem: "timeout" });
    expect(result.outcomes[1].result).toBe("imported");
  });

  it("stops starting emails when the time is up, and says how many are left", async () => {
    fake.emails = [{ id: "a", parse: AUG() }, { id: "b", parse: AUG() }, { id: "c", parse: AUG() }];
    let t = Date.parse("2026-10-23T06:00:00Z");
    const result = await sync({ timeBudgetMs: 1000, now: () => new Date((t += 600)) });
    expect(result.outcomes.length).toBeLessThan(3);
    expect(result.outcomes.length).toBeGreaterThanOrEqual(1);
    expect(result.remaining).toBe(3 - result.outcomes.length);
  });

  it("fills in an account's last 4 from the statement, after its balances are in", async () => {
    fake.accounts = [slice({ last4: undefined })];
    fake.emails = [{ id: "aug", parse: AUG() }];
    const result = await sync();
    expect(fake.accountUpdates).toEqual([{ id: "slice", patch: { last4: "1128" } }]);
    expect(fake.writes.indexOf("accounts.update")).toBeGreaterThan(fake.writes.indexOf("snapshots.createMany"));
    expect(result.outcomes[0].statements[0].notes).toEqual(["filled in Slice Bank Account's last 4 (1128) from the statement"]);
  });

  it("never numbers an account from a PDF holding several statements", async () => {
    fake.accounts = [slice({ last4: undefined })];
    fake.emails = [{ id: "combined", parse: [...AUG(), ...statement("2026-08-01", "2026-08-31", 5, [], "9999")] }];
    const result = await sync();
    expect(fake.accountUpdates).toEqual([]);
    expect(result.outcomes[0].statements.map((s) => s.problem)).toEqual(["no-account", "no-account"]);
    expect(fake.snapshots).toEqual([]);
  });

  it("a PDF holding an account you don't track is reported, and the email is done once the tracked one is in", async () => {
    const both = [...AUG(), ...statement("2026-08-01", "2026-08-31", 5, [], "9999")];
    fake.emails = [{ id: "combined", parse: both }];
    const result = await sync();
    expect(result.outcomes[0].result).toBe("imported");
    expect(result.outcomes[0].statements.map((s) => s.problem ?? s.result)).toEqual(["imported", "no-account"]);
    expect(fake.log[0].result).toBe("Imported");
  });

  it("a dry run reads and plans but writes nothing: no balances, reviews, log or run rows", async () => {
    fake.snapshots = [snap("keep", "2026-08-31", 790)];
    fake.emails = [{ id: "aug", parse: AUG() }];
    const result = await sync({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.outcomes[0].statements[0]).toMatchObject({ created: 1, reviews: [expect.objectContaining({ date: "2026-08-31" })] });
    expect(fake.writes).toEqual([]);
    expect(fake.runs).toEqual([]);
    expect(fake.snapshots).toHaveLength(1);
  });

  it("if the reviews can't be written the email is not logged, so the next sync tries again", async () => {
    fake.snapshots = [snap("keep", "2026-08-31", 790)];
    fake.emails = [{ id: "aug", parse: AUG() }];
    fake.failReviewWrite = true;
    await expect(sync()).rejects.toThrow("Sheets said no");
    expect(fake.log).toEqual([]);
    expect(fake.runs[0]).toMatchObject({ kind: "Accounts", status: "Failed", details: "Sheets said no" });
    fake.failReviewWrite = false;
    await sync();
    expect(fake.reviews).toHaveLength(1);
    // The balance written the first time is there, so the second sync adds nothing twice.
    expect(fake.snapshots.filter((s) => s.date === "2026-07-31")).toHaveLength(1);
  });

  it("records the run as an Accounts run with how many emails did what", async () => {
    fake.emails = [{ id: "aug", parse: AUG() }, { id: "locked", failure: "no_password_matched" }];
    await sync();
    expect(fake.runs[0]).toMatchObject({ kind: "Accounts", trigger: "Manual", status: "Done", imported: 1, duplicates: 0, failed: 1, remaining: 0 });
  });

  it("stands down when another account sync is running, but not for a card sync", async () => {
    fake.emails = [{ id: "aug", parse: AUG() }];
    fake.runs = [{ id: "other", kind: "Accounts", trigger: "Manual", status: "Running", startedAt: "2026-10-23T05:59:00.000Z" }];
    expect(await runAccountStatementSync({ trigger: "Manual", now: () => new Date("2026-10-23T06:00:00Z") })).toEqual({ status: "already-running", runningSince: "2026-10-23T05:59:00.000Z" });
    expect(fake.runs.find((r) => r.status === "Skipped")).toBeTruthy();
    fake.runs = [{ id: "cards", trigger: "Manual", status: "Running", startedAt: "2026-10-23T05:59:00.000Z" }];
    const result = await sync();
    expect(result.outcomes[0].result).toBe("imported");
  });
});
