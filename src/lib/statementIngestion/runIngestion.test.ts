import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card, Statement } from "../sheets/types";

/**
 * The import's card-number checks (#78), with Gmail, the PDF reader, the
 * statement parser and the Sheets repositories faked. Each fake email carries
 * its subject and its PDF's text; the parser reads the statement date from it.
 */
const fake = vi.hoisted(() => ({
  emails: [] as { id: string; subject: string; text: string }[],
  cards: [] as Card[],
  statements: [] as Statement[],
  cardUpdates: [] as { id: string; patch: Partial<Card> }[],
  created: [] as Partial<Statement>[],
}));

vi.mock("@/lib/gmail/client", () => ({ getGmailClient: () => ({}), getStatementLabel: () => "Statements" }));
vi.mock("@/lib/gmail/messages", () => ({
  listMessagesWithLabel: async () => fake.emails.map((e) => ({ id: e.id })),
  getMessage: async (_gmail: unknown, id: string) => ({ id }),
  getSubjectHeader: (message: { id: string }) => fake.emails.find((e) => e.id === message.id)!.subject,
  downloadPdfAttachment: async (_gmail: unknown, message: { id: string }) => new TextEncoder().encode(message.id),
}));
vi.mock("@/lib/pdf/decryptAndExtractText", () => ({
  decryptAndExtractText: async (bytes: Uint8Array) => ({ text: fake.emails.find((e) => e.id === new TextDecoder().decode(bytes))!.text, passwordUsed: null }),
}));
vi.mock("@/lib/statementParsing/parseStatement", () => ({ parseStatement: (text: string) => ({ bank: "unknown", text }) }));
vi.mock("@/lib/statementParsing/toStatementFields", () => ({
  toStatementFields: (details: { text: string }) => ({
    statementDate: details.text.match(/date (\S+)/)![1],
    dueDate: "2026-11-05",
    totalAmountDue: 38500,
    minimumAmountDue: 3850,
  }),
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
    create: async (input: Partial<Statement>) => {
      fake.created.push(input);
      return { ...input, id: `s${fake.created.length}` };
    },
  },
}));
vi.mock("./processedMessageIds", () => ({
  loadProcessedMessageIds: async () => ({ ids: [] }),
  isProcessed: () => false,
  markProcessed: (store: unknown) => store,
  saveProcessedMessageIds: async () => {},
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

beforeEach(() => {
  fake.emails = [];
  fake.statements = [];
  fake.cardUpdates = [];
  fake.created = [];
});

describe("runStatementIngestion and the card number", () => {
  it("fills in a card's missing last 4 from its statement, once, and says so", async () => {
    fake.cards = [regalia()];
    fake.emails = [
      { id: "m1", subject: SUBJECT, text: "date 2026-10-16 Card No 4386 24XX XXXX 1234" },
      { id: "m2", subject: SUBJECT, text: "date 2026-09-16 Card No 4386 24XX XXXX 1234" },
    ];
    const { outcomes } = await runStatementIngestion();
    expect(outcomes.map((o) => o.outcome)).toEqual(["created", "created"]);
    expect(outcomes[0].notes).toEqual(["filled in HDFC Bank Regalia Gold Credit Card's last 4 (1234) from the statement"]);
    expect(outcomes[1].notes).toBeUndefined();
    expect(fake.cardUpdates).toEqual([{ id: "regalia", patch: { last4: "1234" } }]);
  });

  it("skips a statement whose card number doesn't match its card, and says what to do", async () => {
    fake.cards = [regalia("1234")];
    fake.emails = [{ id: "m1", subject: SUBJECT, text: "date 2026-10-16 Card No 4386 24XX XXXX 8821" }];
    const [outcome] = (await runStatementIngestion()).outcomes;
    expect(outcome.outcome).toBe("skipped");
    expect(outcome.reason).toContain("the PDF shows a card ending 8821, but HDFC Bank Regalia Gold Credit Card ends 1234");
    expect(outcome.reason).toContain("If the card was reissued");
    expect(fake.created).toEqual([]);
  });

  it("imports a statement that shows the card's last 4", async () => {
    fake.cards = [regalia("1234")];
    fake.emails = [{ id: "m1", subject: SUBJECT, text: "date 2026-10-16 XXXX XXXX XXXX 1234" }];
    expect((await runStatementIngestion()).outcomes[0]).toMatchObject({ outcome: "created", cardId: "regalia" });
    expect(fake.cardUpdates).toEqual([]);
  });

  it("treats a second email for a statement it just imported as a duplicate", async () => {
    fake.cards = [regalia("1234")];
    fake.emails = [
      { id: "m1", subject: SUBJECT, text: "date 2026-10-16 XXXX XXXX XXXX 1234" },
      { id: "m2", subject: SUBJECT, text: "date 2026-10-16 XXXX XXXX XXXX 1234" },
    ];
    const { outcomes } = await runStatementIngestion();
    expect(outcomes.map((o) => o.outcome)).toEqual(["created", "duplicate"]);
    expect(fake.created).toHaveLength(1);
  });
});
