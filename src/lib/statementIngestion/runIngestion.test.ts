import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, Statement, StatementEmail, SyncRun } from "../sheets/types";

/**
 * The sync with Gmail, the PDF reader, the statement parser and the Sheets
 * repositories faked. Each fake email carries its subject and its PDF's text;
 * the parser reads the statement date from it. The bank is detected from the
 * text for real, so a fake HDFC statement names HDFC Bank. The SyncRuns and
 * StatementEmails tabs are kept in memory, so a second sync sees the first's.
 */
const fake = vi.hoisted(() => ({
  emails: [] as { id: string; subject: string; text: string; hangs?: boolean; noPdf?: boolean; pdfFailure?: string }[],
  /** The bank each parse was asked to read the text as. */
  parsedAs: [] as (string | undefined)[],
  cards: [] as Card[],
  statements: [] as Statement[],
  cardUpdates: [] as { id: string; patch: Partial<Card> }[],
  /** Each createMany call to CardStatements. */
  statementWrites: [] as Partial<Statement>[][],
  failStatementWrite: false,
  failRunUpdates: false,
  runs: [] as SyncRun[],
  log: [] as StatementEmail[],
  logUpdates: [] as { id: string; patch: Partial<StatementEmail> }[][],
  nextId: 0,
}));

vi.mock("@/lib/gmail/client", () => ({ getGmailClient: () => ({}), getStatementLabel: () => "Statements" }));
vi.mock("@/lib/gmail/messages", () => ({
  listMessagesWithLabel: async () => fake.emails.map((e) => ({ id: e.id })),
  // 1792368000000 is 00:00 on 2026-10-19 UTC, and 05:30 that day in India.
  getMessage: async (_gmail: unknown, id: string) => ({ id, internalDate: "1792368000000" }),
  getSubjectHeader: (message: { id: string }) => fake.emails.find((e) => e.id === message.id)!.subject,
  downloadPdfAttachment: async (_gmail: unknown, message: { id: string }) => (fake.emails.find((e) => e.id === message.id)!.noPdf ? null : new TextEncoder().encode(message.id)),
}));
vi.mock("@/lib/pdf/decryptAndExtractText", () => ({
  decryptAndExtractText: async (bytes: Uint8Array) => {
    const email = fake.emails.find((e) => e.id === new TextDecoder().decode(bytes))!;
    if (email.hangs) await new Promise(() => {});
    if (email.pdfFailure) return { failure: email.pdfFailure };
    return { text: email.text, passwordUsed: null };
  },
}));
vi.mock("@/lib/statementParsing/parseStatement", () => ({
  parseStatement: (text: string, bank?: string) => {
    fake.parsedAs.push(bank);
    return { bank, text };
  },
}));
vi.mock("@/lib/statementParsing/toStatementFields", () => ({
  toStatementFields: (details: { text: string }) => {
    const date = details.text.match(/date (\S+)/)?.[1];
    return date ? { fields: { statementDate: date, dueDate: "2026-11-05", totalAmountDue: 38500, minimumAmountDue: 3850 } } : { problem: "couldn't read the statement date from the PDF" };
  },
}));
vi.mock("@/lib/sheets/cards", () => ({
  cardsRepository: {
    readAll: async () => ({ records: fake.cards, invalid: [] }),
    update: async (id: string, patch: Partial<Card>) => {
      fake.cardUpdates.push({ id, patch });
      return { ...fake.cards.find((c) => c.id === id)!, ...patch };
    },
  },
}));
vi.mock("@/lib/sheets/statements", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sheets/statements")>()),
  statementsRepository: {
    readAll: async () => ({ records: fake.statements, invalid: [] }),
    createMany: async (inputs: Partial<Statement>[]) => {
      if (fake.failStatementWrite) throw new Error("Sheets said no");
      if (inputs.length > 0) fake.statementWrites.push(inputs);
      const created = inputs.map((input) => ({ ...input, id: `s${++fake.nextId}` }) as Statement);
      fake.statements.push(...created);
      return created;
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
    update: async (id: string, patch: Partial<SyncRun>) => {
      if (fake.failRunUpdates) throw new Error("quota");
      return Object.assign(fake.runs.find((r) => r.id === id)!, patch);
    },
    updateMany: async (changes: { id: string; patch: Partial<SyncRun> }[]) => changes.map(({ id, patch }) => Object.assign(fake.runs.find((r) => r.id === id)!, patch)),
  },
}));
vi.mock("@/lib/sheets/statementEmails", () => ({
  statementEmailsRepository: {
    list: async () => fake.log,
    createMany: async (inputs: Omit<StatementEmail, "id">[]) => {
      const rows = inputs.map((input) => ({ ...input, id: `log${++fake.nextId}` }));
      fake.log.push(...rows);
      return rows;
    },
    updateMany: async (changes: { id: string; patch: Partial<StatementEmail> }[]) => {
      if (changes.length > 0) fake.logUpdates.push(changes);
      return changes.map(({ id, patch }) => Object.assign(fake.log.find((r) => r.id === id)!, patch));
    },
  },
}));

const { runStatementIngestion } = await import("./runIngestion");

const regalia = (last4?: string): Card => ({
  id: "regalia",
  name: "HDFC Bank Regalia Gold Credit Card",
  alias: "Regalia Gold",
  issuer: "HDFC-Bank",
  cardType: "Reward-Points",
  creditLimit: 672000,
  statementDay: 16,
  dueDayBuffer: 20,
  status: "Active",
  ...(last4 && { last4 }),
});
const SUBJECT = "Your HDFC Bank - Regalia Gold Credit Card Statement - October-2026";
const email = (id: string, statementDate: string, extra: Partial<(typeof fake.emails)[number]> = {}) => ({ id, subject: SUBJECT, text: `HDFC Bank date ${statementDate} XXXX XXXX XXXX 1234`, ...extra });

async function sync(options: Partial<Parameters<typeof runStatementIngestion>[0]> = {}) {
  const result = await runStatementIngestion({ trigger: "Manual", ...options });
  if (result.status !== "done") throw new Error(`expected the sync to run, but it was ${result.status}`);
  return result;
}

beforeEach(() => {
  fake.emails = [];
  fake.parsedAs = [];
  fake.cards = [regalia("1234")];
  fake.statements = [];
  fake.cardUpdates = [];
  fake.statementWrites = [];
  fake.failStatementWrite = false;
  fake.failRunUpdates = false;
  fake.runs = [];
  fake.log = [];
  fake.logUpdates = [];
  fake.nextId = 0;
});

describe("reading each email", () => {
  it("checks the PDF, the card, its bank, the fields, the last 4, then for a duplicate, and gives the first reason that applies", async () => {
    fake.statements = [{ id: "typed-in", cardId: "regalia", statementDate: "2026-10-16", dueDate: "2026-11-05", totalAmountDue: 38500, minimumAmountDue: 3850, status: "Pending" }];
    // Each one fails the checks after its own too.
    const other = { subject: "Your account summary", text: "YES BANK, no statement here XXXX 8821" };
    fake.emails = [
      { id: "no-pdf", ...other, noPdf: true },
      { id: "locked", ...other, pdfFailure: "no_password_matched" },
      { id: "no-card", ...other },
      { id: "other-bank", subject: SUBJECT, text: other.text },
      { id: "no-date", subject: SUBJECT, text: "HDFC Bank, no statement here XXXX 8821" },
      { id: "other-number", subject: SUBJECT, text: "HDFC Bank date 2026-10-16 XXXX 8821" },
      email("duplicate", "2026-10-16"),
    ];
    const { outcomes } = await sync();
    expect(outcomes.map((o) => [o.messageId, o.outcome, o.cardId, o.reason])).toEqual([
      ["no-pdf", "skipped", undefined, "no PDF attachment found"],
      ["locked", "skipped", undefined, "no_password_matched"],
      ["no-card", "skipped", undefined, 'no card matched "Your account summary"'],
      ["other-bank", "skipped", "regalia", expect.stringContaining("the PDF looks like it's from YES Bank")],
      ["no-date", "skipped", "regalia", "couldn't read the statement date from the PDF"],
      ["other-number", "skipped", "regalia", expect.stringContaining("the PDF shows a card ending 8821")],
      ["duplicate", "duplicate", "regalia", undefined],
    ]);
  });

  it("reads a statement with the parser for its card's issuer", async () => {
    fake.emails = [email("m1", "2026-10-16")];
    const [outcome] = (await sync()).outcomes;
    expect(outcome.outcome).toBe("created");
    expect(fake.parsedAs).toEqual(["hdfc"]);
  });

  it("skips a statement whose PDF looks like another bank's, without reading it", async () => {
    fake.emails = [email("m1", "2026-10-16", { text: "Axis Bank date 2026-10-16 XXXX XXXX XXXX 1234" })];
    const [outcome] = (await sync()).outcomes;
    expect(outcome).toMatchObject({
      outcome: "skipped",
      cardId: "regalia",
      reason: "the PDF looks like it's from Axis Bank and doesn't mention HDFC Bank, HDFC Bank Regalia Gold Credit Card's issuer, so it's probably another card's statement. If that's the wrong issuer, change it in the Cards tab",
    });
    expect(fake.parsedAs).toEqual([]);
    expect(fake.statementWrites).toEqual([]);
    expect(fake.log[0]).toMatchObject({ result: "Failed", cardId: "regalia" });
  });

  it("skips a statement for a card whose issuer has no parser, rather than guess with the generic patterns", async () => {
    fake.cards = [{ ...regalia("1234"), issuer: "Other" }];
    fake.emails = [email("m1", "2026-10-16")];
    const [outcome] = (await sync()).outcomes;
    expect(outcome).toMatchObject({
      outcome: "skipped",
      cardId: "regalia",
      reason: "the app can't read statements from HDFC Bank Regalia Gold Credit Card's issuer, Other. If that's the wrong issuer, change it in the Cards tab",
    });
    expect(fake.parsedAs).toEqual([]);
    expect(fake.statementWrites).toEqual([]);
  });
});

describe("the card number (#78)", () => {
  it("fills in a card's missing last 4 from its statement, once, and says so", async () => {
    fake.cards = [regalia()];
    fake.emails = [
      { id: "m1", subject: SUBJECT, text: "HDFC Bank date 2026-10-16 Card No 4386 24XX XXXX 1234" },
      { id: "m2", subject: SUBJECT, text: "HDFC Bank date 2026-09-16 Card No 4386 24XX XXXX 1234" },
    ];
    const { outcomes } = await sync();
    expect(outcomes.map((o) => o.outcome)).toEqual(["created", "created"]);
    expect(outcomes[0].notes).toEqual(["filled in HDFC Bank Regalia Gold Credit Card's last 4 (1234) from the statement"]);
    expect(outcomes[1].notes).toBeUndefined();
    expect(fake.cardUpdates).toEqual([{ id: "regalia", patch: { last4: "1234" } }]);
  });

  it("skips a statement whose card number doesn't match its card, and says what to do", async () => {
    fake.emails = [{ id: "m1", subject: SUBJECT, text: "HDFC Bank date 2026-10-16 Card No 4386 24XX XXXX 8821" }];
    const [outcome] = (await sync()).outcomes;
    expect(outcome.outcome).toBe("skipped");
    expect(outcome.reason).toContain("the PDF shows a card ending 8821, but HDFC Bank Regalia Gold Credit Card ends 1234");
    expect(outcome.reason).toContain("If the card was reissued");
    expect(fake.statementWrites).toEqual([]);
  });

  it("imports a statement that shows the card's last 4", async () => {
    fake.emails = [email("m1", "2026-10-16")];
    const [outcome] = (await sync()).outcomes;
    expect(outcome).toMatchObject({ outcome: "created", cardId: "regalia", statementId: fake.statements[0].id });
    expect(fake.cardUpdates).toEqual([]);
  });
});

describe("writing what it read", () => {
  it("adds the new statements in one write, and treats a second email for one as a duplicate of it", async () => {
    fake.emails = [email("m1", "2026-10-16"), email("m2", "2026-10-16"), email("m3", "2026-09-16")];
    const { outcomes } = await sync();
    expect(outcomes.map((o) => o.outcome)).toEqual(["created", "duplicate", "created"]);
    expect(fake.statementWrites).toHaveLength(1);
    expect(fake.statementWrites[0].map((s) => s.statementDate)).toEqual(["2026-10-16", "2026-09-16"]);
    // The duplicate points at the statement its twin added, once that statement has an id.
    expect(outcomes[1].statementId).toBe(outcomes[0].statementId);
    expect(outcomes[0].statementId).toBeDefined();
  });

  it("logs every email it read, with its date, result and statement", async () => {
    fake.emails = [email("m1", "2026-10-16"), { id: "m2", subject: SUBJECT, text: "HDFC Bank, but no statement here" }];
    await sync({ now: () => new Date("2026-10-19T10:00:00.000Z") });
    expect(fake.log).toEqual([
      expect.objectContaining({ messageId: "m1", receivedDate: "2026-10-19", subject: SUBJECT, cardId: "regalia", result: "Imported", statementId: fake.statements[0].id, attempts: 1, lastTriedAt: "2026-10-19T10:00:00.000Z" }),
      expect.objectContaining({ messageId: "m2", cardId: "regalia", result: "Failed", details: "couldn't read the statement date from the PDF", attempts: 1 }),
    ]);
  });

  it("logs a statement already in the Sheet as a duplicate of it", async () => {
    fake.statements = [{ id: "typed-in", cardId: "regalia", statementDate: "2026-10-16", dueDate: "2026-11-05", totalAmountDue: 38500, minimumAmountDue: 3850, status: "Pending" }];
    fake.emails = [email("m1", "2026-10-16")];
    await sync();
    expect(fake.log[0]).toMatchObject({ result: "Duplicate", statementId: "typed-in" });
    expect(fake.statementWrites).toEqual([]);
  });

  it("logs nothing when the statements can't be written, so the next sync reads those emails again", async () => {
    fake.emails = [email("m1", "2026-10-16")];
    fake.failStatementWrite = true;
    await expect(runStatementIngestion({ trigger: "Manual" })).rejects.toThrow("Sheets said no");
    expect(fake.log).toEqual([]);
    expect(fake.runs[0]).toMatchObject({ status: "Failed", details: "Sheets said no" });
  });
});

describe("the next sync", () => {
  it("skips the emails already done, and reads only the new one", async () => {
    fake.emails = [email("m1", "2026-10-16")];
    await sync();
    fake.emails = [email("m2", "2026-11-16"), ...fake.emails];
    const { outcomes } = await sync();
    expect(outcomes.map((o) => o.messageId)).toEqual(["m2"]);
  });

  it("tries a failed email again, counting the try on its row", async () => {
    fake.cards = [];
    fake.emails = [email("m1", "2026-10-16")];
    await sync();
    expect(fake.log[0]).toMatchObject({ result: "Failed", attempts: 1 });

    fake.cards = [regalia("1234")];
    const { outcomes } = await sync();
    expect(outcomes[0].outcome).toBe("created");
    expect(fake.log).toHaveLength(1);
    expect(fake.log[0]).toMatchObject({ result: "Imported", attempts: 2, details: undefined });
  });

  it("reads an email again once its statement has been deleted from the Sheet", async () => {
    fake.emails = [email("m1", "2026-10-16")];
    await sync();
    fake.statements = [];
    const { outcomes } = await sync();
    expect(outcomes.map((o) => o.outcome)).toEqual(["created"]);
    expect(fake.log[0]).toMatchObject({ result: "Imported", attempts: 2 });
  });
});

describe("time limits", () => {
  it("stops starting emails once its time budget is spent, says how many are left, and the next sync carries on", async () => {
    fake.emails = [email("m1", "2026-10-16"), email("m2", "2026-09-16"), email("m3", "2026-08-16")];
    // Each look at the clock is 25 seconds later: m2 starts 25s in, m3 would start 50s in.
    let seconds = 0;
    const now = () => new Date(Date.UTC(2026, 9, 19, 10, 0, (seconds += 25)));
    const first = await sync({ now, timeBudgetMs: 45_000 });
    expect(first.outcomes.map((o) => o.messageId)).toEqual(["m1", "m2"]);
    expect(first.remaining).toBe(1);
    expect(fake.runs[0]).toMatchObject({ status: "Done", imported: 2, remaining: 1 });

    const second = await sync();
    expect(second.outcomes.map((o) => o.messageId)).toEqual(["m3"]);
    expect(second.remaining).toBe(0);
  });

  it("counts only new emails as left, so syncing again until none are left always ends", async () => {
    fake.log = [{ id: "log-old", messageId: "old", result: "Failed", attempts: 4, lastTriedAt: "2026-10-18T10:00:00.000Z" }];
    fake.emails = [email("new", "2026-10-16"), { id: "old", subject: SUBJECT, text: "no statement here" }];
    const { outcomes, remaining } = await sync({ timeBudgetMs: 0 });
    expect(outcomes.map((o) => o.messageId)).toEqual(["new"]);
    expect(remaining).toBe(0);
  });

  it("gives up on an email that takes too long, logging it as failed, and reads the rest", async () => {
    fake.emails = [email("slow", "2026-10-16", { hangs: true }), email("m2", "2026-09-16")];
    const { outcomes } = await sync({ emailTimeoutMs: 20 });
    expect(outcomes.map((o) => o.outcome)).toEqual(["skipped", "created"]);
    expect(outcomes[0].reason).toContain("left for the next sync");
    expect(fake.log.map((row) => row.result)).toEqual(["Failed", "Imported"]);
  });
});

describe("one sync at a time", () => {
  it("records a finished sync with what it did", async () => {
    fake.emails = [email("m1", "2026-10-16"), email("m2", "2026-10-16")];
    await sync({ trigger: "Scheduled" });
    expect(fake.runs).toEqual([expect.objectContaining({ trigger: "Scheduled", status: "Done", imported: 1, duplicates: 1, failed: 0, remaining: 0 })]);
    expect(fake.runs[0].finishedAt).toBeDefined();
  });

  it("still returns what it did when recording the finished sync fails", async () => {
    fake.emails = [email("m1", "2026-10-16")];
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.failRunUpdates = true;
    const { outcomes } = await sync();
    expect(outcomes.map((o) => o.outcome)).toEqual(["created"]);
    expect(fake.log).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it("does nothing while another sync is running, and says since when", async () => {
    const startedAt = new Date(Date.now() - 60_000).toISOString();
    fake.runs = [{ id: "other", trigger: "Scheduled", status: "Running", startedAt }];
    fake.emails = [email("m1", "2026-10-16")];
    expect(await runStatementIngestion({ trigger: "Manual" })).toEqual({ status: "already-running", runningSince: startedAt });
    expect(fake.runs[1]).toMatchObject({ trigger: "Manual", status: "Skipped" });
    expect(fake.log).toEqual([]);
  });

  it("goes ahead past a sync that died, marking it failed", async () => {
    fake.runs = [{ id: "dead", trigger: "Scheduled", status: "Running", startedAt: new Date(Date.now() - 60 * 60_000).toISOString() }];
    await sync();
    expect(fake.runs[0]).toMatchObject({ status: "Failed", details: expect.stringContaining("Stopped before it finished") });
    expect(fake.runs[1].status).toBe("Done");
  });
});
