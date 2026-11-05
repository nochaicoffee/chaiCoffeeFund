import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EpfAccount, EpfEntry } from "@/lib/sheets/types";
import { encodeDecisions } from "@/lib/epfStatement/decisions";
import { FAKE, aTypicalYear, syntheticPassbookPdf } from "@/lib/epfStatement/__fixtures__/syntheticPassbook";

const fake = vi.hoisted(() => ({ accounts: [] as EpfAccount[], entries: [] as EpfEntry[], tags: [] as string[], failWrites: false, n: 0 }));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => fake.tags.push(tag), unstable_cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/sheets/epfAccounts", () => ({
  epfAccountsRepository: {
    list: async () => fake.accounts,
    create: async (input: Omit<EpfAccount, "id">) => { const row = { ...input, id: `acc-new${++fake.n}` }; fake.accounts.push(row); return row; },
    update: async (id: string, patch: Partial<EpfAccount>) => Object.assign(fake.accounts.find((a) => a.id === id)!, patch),
  },
}));
vi.mock("@/lib/sheets/epfEntries", () => ({
  epfEntriesRepository: {
    list: async () => fake.entries,
    createMany: async (inputs: Omit<EpfEntry, "id">[]) => {
      if (fake.failWrites) throw new Error("Sheets said no");
      const rows = inputs.map((i) => ({ ...i, id: `ent${++fake.n}` }));
      fake.entries.push(...rows);
      return rows;
    },
    updateMany: async (changes: { id: string; patch: Partial<EpfEntry> }[]) => changes.map((c) => Object.assign(fake.entries.find((e) => e.id === c.id)!, c.patch)),
    removeWhere: async (match: (v: unknown) => boolean) => { const keep = fake.entries.filter((e) => !match(e)); const gone = fake.entries.length - keep.length; fake.entries = keep; return gone; },
  },
}));
vi.mock("@/lib/sheets/epfRates", () => ({ epfRatesRepository: { list: async () => [] } }));

const { readEpfStatement, confirmEpfStatement } = await import("./epfImportActions");

const pdfFile = (year = aTypicalYear()) => new File([syntheticPassbookPdf(year) as BlobPart], "passbook.pdf", { type: "application/pdf" });
const read = (file: File) => { const d = new FormData(); d.set("file", file); return d; };
const NOTHING = { edits: { changed: {}, added: [] }, choice: null, resolutions: {}, contradicted: {} };
const confirm = (file: File, decisions: object = NOTHING) => { const d = read(file); d.set("decisions", encodeDecisions(decisions as never)); return d; };
const account: EpfAccount = { id: "acc-0", name: "Example", memberIdLast4: FAKE.memberIdLast4, status: "Active" };

beforeEach(() => { fake.accounts = [{ ...account }]; fake.entries = []; fake.tags = []; fake.failWrites = false; fake.n = 0; });

describe("readEpfStatement", () => {
  it("reads a passbook and sends what the review needs, and nothing personal", async () => {
    const result = await readEpfStatement(read(pdfFile()));
    expect(result.status).toBe("read");
    if (result.status !== "read") return;
    expect(result.passbook.credits).toHaveLength(12);
    expect(result.accounts).toEqual([account]);
    for (const secret of [FAKE.uan, FAKE.dateOfBirth, FAKE.memberName, FAKE.memberId]) expect(JSON.stringify(result)).not.toContain(secret);
    expect(fake.entries).toEqual([]);
  });
  it("says what's wrong, in plain words, with a missing file, a big one, or one that isn't a passbook", async () => {
    expect(await readEpfStatement(new FormData())).toEqual({ status: "unreadable", problem: "Choose the passbook PDF first" });
    const big = new File([new Uint8Array(900_000)], "big.pdf");
    expect(await readEpfStatement(read(big))).toMatchObject({ status: "unreadable", problem: expect.stringMatching(/too big/) });
    expect(await readEpfStatement(read(new File(["not a pdf"], "x.pdf")))).toMatchObject({ status: "unreadable", problem: expect.stringMatching(/Couldn't read this file/) });
  });
});

describe("confirmEpfStatement", () => {
  it("writes the credits, the interest and the opening balance, and marks the account confirmed", async () => {
    const result = await confirmEpfStatement(confirm(pdfFile()));
    expect(result.status).toBe("saved");
    expect(fake.entries).toHaveLength(14);
    expect(fake.accounts[0].confirmedThrough).toBe("2026-03-31");
    expect(fake.tags).toEqual(["epfAccounts", "epfEntries"]);
  });
  it("importing the same file again changes nothing", async () => {
    await confirmEpfStatement(confirm(pdfFile()));
    const before = JSON.stringify(fake.entries);
    expect((await confirmEpfStatement(confirm(pdfFile()))).status).toBe("saved");
    expect(JSON.stringify(fake.entries)).toBe(before);
  });
  it("writes nothing for a file that doesn't add up, and with no corrections says which check", async () => {
    const short = aTypicalYear({ closing: { employee: 230000, employer: 229000, pension: 0 } });
    const result = await confirmEpfStatement(confirm(pdfFile(short)));
    expect(result).toEqual({ status: "invalid", errors: { form: "The checks don't pass, so nothing can be imported yet" } });
    expect(fake.entries).toEqual([]);
  });
  it("takes corrections but never rows from the browser: an added row saves as typed", async () => {
    const full = aTypicalYear();
    const missing = { ...full, credits: full.credits.filter((_, i) => i !== 5), printedTotal: { employee: 120000, employer: 120000, pension: 0 }, closing: { employee: 229000, employer: 229000, pension: 0 } };
    const added = { wageMonth: "2025-08", date: "2025-09-01", employee: 10000, employer: 10000, pension: 0 };
    const result = await confirmEpfStatement(confirm(pdfFile(missing), { ...NOTHING, edits: { changed: {}, added: [added] } }));
    expect(result.status).toBe("saved");
    expect(fake.entries.find((e) => e.wageMonth === "2025-08")?.source).toBe("Typed");
    expect(fake.entries.filter((e) => e.kind === "Contribution" && e.wageMonth !== "2025-08").every((e) => e.source === "Passbook")).toBe(true);
  });
  it("creates the account he named when none matches", async () => {
    fake.accounts = [];
    const result = await confirmEpfStatement(confirm(pdfFile(), { ...NOTHING, choice: { kind: "new", name: "Example job" } }));
    expect(result.status).toBe("saved");
    expect(fake.accounts[0]).toMatchObject({ name: "Example job", memberIdLast4: FAKE.memberIdLast4 });
    expect(fake.entries.every((e) => e.epfAccountId === fake.accounts[0].id)).toBe(true);
  });
  it("asks for an account instead of guessing when none matches", async () => {
    fake.accounts = [{ ...account, memberIdLast4: "9999" }];
    expect(await confirmEpfStatement(confirm(pdfFile()))).toEqual({ status: "invalid", errors: { form: "Choose which EPF account this passbook is for" } });
    expect(fake.entries).toEqual([]);
  });
  it("refuses answers that aren't well formed, and says failed when the Sheet does", async () => {
    const d = read(pdfFile());
    d.set("decisions", "nonsense");
    expect((await confirmEpfStatement(d)).status).toBe("invalid");
    fake.failWrites = true;
    expect((await confirmEpfStatement(confirm(pdfFile()))).status).toBe("failed");
    expect(fake.tags).toEqual([]);
  });
});
