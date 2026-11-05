import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EpfAccount, EpfEntry, EpfRate } from "@/lib/sheets/types";

const fake = vi.hoisted(() => ({ accounts: [] as EpfAccount[], entries: [] as EpfEntry[], rates: [] as EpfRate[], tags: [] as string[], fail: false, n: 0, accountWrites: 0 }));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => fake.tags.push(tag), unstable_cache: <T,>(fn: T) => fn }));
const guard = () => { if (fake.fail) throw new Error("Sheets said no"); };
vi.mock("@/lib/sheets/epfAccounts", async (original) => ({
  ...(await original<object>()),
  epfAccountsRepository: {
    list: async () => fake.accounts,
    update: async (id: string, patch: Partial<EpfAccount>) => { guard(); fake.accountWrites++; return Object.assign(fake.accounts.find((a) => a.id === id)!, patch); },
  },
}));
vi.mock("@/lib/sheets/epfEntries", async (original) => ({
  ...(await original<object>()),
  epfEntriesRepository: {
    list: async () => fake.entries,
    get: async (id: string) => fake.entries.find((e) => e.id === id) ?? null,
    create: async (input: Omit<EpfEntry, "id">) => { guard(); const row = { ...input, id: `new${++fake.n}` }; fake.entries.push(row); return row; },
    update: async (id: string, patch: Partial<EpfEntry>) => { guard(); return Object.assign(fake.entries.find((e) => e.id === id)!, patch); },
    remove: async (id: string) => { guard(); fake.entries = fake.entries.filter((e) => e.id !== id); },
  },
}));
vi.mock("@/lib/sheets/epfRates", async (original) => ({
  ...(await original<object>()),
  epfRatesRepository: {
    list: async () => fake.rates,
    create: async (input: Omit<EpfRate, "id">) => { guard(); const row = { ...input, id: `rate${++fake.n}` }; fake.rates.push(row); return row; },
    update: async (id: string, patch: Partial<EpfRate>) => { guard(); return Object.assign(fake.rates.find((r) => r.id === id)!, patch); },
    remove: async (id: string) => { guard(); fake.rates = fake.rates.filter((r) => r.id !== id); },
  },
}));

const { saveEpfContribution, saveEpfCredited, saveEpfSettings, deleteEpfEntry, undoEpfEntry } = await import("./epfFormActions");
const IDLE = { status: "idle" } as never;
const form = (values: Record<string, string>) => { const d = new FormData(); for (const [k, v] of Object.entries(values)) d.set(k, v); return d; };
const account: EpfAccount = { id: "acc", name: "NetApp India", status: "Active" };
const passbookCredit: EpfEntry = { id: "p1", epfAccountId: "acc", kind: "Contribution", wageMonth: "2025-05", date: "2025-06-01", employee: 100, employer: 100, pension: 0, source: "Passbook" };
const contribution = { epfAccountId: "acc", wageMonth: "2025-08", date: "2025-09-01", employee: "10,000", employer: "10,000" };

beforeEach(() => { fake.accounts = [{ ...account }]; fake.entries = []; fake.rates = []; fake.tags = []; fake.fail = false; fake.n = 0; fake.accountWrites = 0; });

describe("saveEpfContribution", () => {
  it("adds a typed credit and hands back what Undo takes back", async () => {
    const result = await saveEpfContribution(IDLE, form(contribution));
    expect(result).toMatchObject({ status: "saved", undo: { message: expect.stringContaining("Aug 2025") } });
    expect(JSON.parse(result.status === "saved" ? result.undo!.id : "{}")).toMatchObject({ id: "new1", date: "2025-09-01", employee: 10000 });
    expect(fake.entries[0]).toMatchObject({ kind: "Contribution", wageMonth: "2025-08", employee: 10000, employer: 10000, pension: 0, source: "Typed" });
    expect(fake.tags).toEqual(["epfEntries"]);
  });
  it("says what's wrong and writes nothing", async () => {
    expect(await saveEpfContribution(IDLE, form({ ...contribution, wageMonth: "" }))).toMatchObject({ status: "invalid", errors: { wageMonth: expect.any(String) } });
    fake.entries = [passbookCredit];
    expect(await saveEpfContribution(IDLE, form({ ...contribution, wageMonth: "2025-05", date: "2025-06-02" }))).toMatchObject({ status: "invalid", errors: { wageMonth: expect.stringMatching(/already a credit/) } });
    expect(fake.entries).toHaveLength(1);
  });
  it("edits a typed credit but never a passbook's", async () => {
    fake.entries = [{ ...passbookCredit, id: "t1", wageMonth: "2025-04", date: "2025-05-01", source: "Typed" }, passbookCredit];
    expect((await saveEpfContribution(IDLE, form({ ...contribution, id: "t1", wageMonth: "2025-04", date: "2025-05-03" }))).status).toBe("saved");
    expect(fake.entries[0]).toMatchObject({ date: "2025-05-03", employee: 10000, source: "Typed" });
    const refused = await saveEpfContribution(IDLE, form({ ...contribution, id: "p1", wageMonth: "2025-05", date: "2025-06-03" }));
    expect(refused).toMatchObject({ status: "invalid", errors: { form: expect.stringMatching(/read from a passbook/) } });
    expect(fake.entries[1].employee).toBe(100);
    expect(await saveEpfContribution(IDLE, form({ ...contribution, id: "missing" }))).toMatchObject({ errors: { form: expect.stringMatching(/isn't in the Sheet/) } });
  });
  it("says failed when the Sheet does", async () => {
    fake.fail = true;
    expect((await saveEpfContribution(IDLE, form(contribution))).status).toBe("failed");
  });
});

describe("saveEpfCredited", () => {
  it("adds a year's interest dated 31 March, typed", async () => {
    const result = await saveEpfCredited(IDLE, form({ epfAccountId: "acc", kind: "Interest", financialYear: "2025-26", employee: "20,462", employer: "20,462" }));
    expect(result.status).toBe("saved");
    expect(fake.entries[0]).toMatchObject({ kind: "Interest", date: "2026-03-31", employee: 20462, source: "Typed" });
    expect(fake.entries[0].wageMonth).toBeUndefined();
  });
  it("adds an opening balance, once", async () => {
    const opening = { epfAccountId: "acc", kind: "Opening", date: "2025-03-31", employee: "1,00,000", employer: "1,00,000" };
    expect((await saveEpfCredited(IDLE, form(opening))).status).toBe("saved");
    expect(await saveEpfCredited(IDLE, form(opening))).toMatchObject({ status: "invalid", errors: { date: expect.stringMatching(/already has an opening/) } });
  });
});

describe("undo and delete", () => {
  it("undo removes the typed row it wrote, and leaves one a passbook has since replaced", async () => {
    const token = (await saveEpfContribution(IDLE, form(contribution)).then((r) => (r.status === "saved" ? r.undo!.id : ""))) as string;
    expect(await undoEpfEntry(token)).toEqual({ ok: true, message: "Put back as it was." });
    expect(fake.entries).toEqual([]);
    fake.entries = [passbookCredit];
    const passbookToken = JSON.stringify({ id: "p1", date: passbookCredit.date, employee: 100, employer: 100, pension: 0 });
    expect((await undoEpfEntry(passbookToken)).ok).toBe(false);
    expect(fake.entries).toHaveLength(1);
    expect(await undoEpfEntry(JSON.stringify({ id: "gone", date: "2025-01-01", employee: 1, employer: 1, pension: 0 }))).toEqual({ ok: true, message: "Already removed." });
    expect((await undoEpfEntry("not a token")).ok).toBe(false);
  });
  it("undo leaves a row he edited since adding it", async () => {
    const token = (await saveEpfContribution(IDLE, form(contribution)).then((r) => (r.status === "saved" ? r.undo!.id : ""))) as string;
    await saveEpfContribution(IDLE, form({ ...contribution, id: "new1", employee: "9,000" }));
    expect(await undoEpfEntry(token)).toMatchObject({ ok: false, message: expect.stringMatching(/changed since/) });
    expect(fake.entries).toHaveLength(1);
  });
  it("deletes a row, typed or from a passbook", async () => {
    fake.entries = [passbookCredit];
    expect((await deleteEpfEntry(IDLE, form({ id: "p1" }))).status).toBe("saved");
    expect(fake.entries).toEqual([]);
    expect((await deleteEpfEntry(IDLE, form({}))).status).toBe("invalid");
  });
});

describe("saveEpfSettings", () => {
  const settings = { epfAccountId: "acc", "rate:2026-27": "8.5", "source:2026-27": "Declared", projectionCredit: "39,308" };
  it("stores a rate he was told, as declared, and the monthly credit", async () => {
    expect((await saveEpfSettings(IDLE, form(settings))).status).toBe("saved");
    expect(fake.rates).toEqual([{ id: "rate1", epfAccountId: "acc", financialYear: "2026-27", ratePercent: 8.5, source: "Declared" }]);
    expect(fake.accounts[0].projectionCredit).toBe(39308);
    expect(fake.tags).toEqual(["epfRates", "epfAccounts"]);
  });
  it("changes the stored rate in place and removes it when left blank", async () => {
    await saveEpfSettings(IDLE, form(settings));
    await saveEpfSettings(IDLE, form({ ...settings, "rate:2026-27": "8.25", "source:2026-27": "Assumed" }));
    expect(fake.rates).toHaveLength(1);
    expect(fake.rates[0]).toMatchObject({ ratePercent: 8.25, source: "Assumed" });
    await saveEpfSettings(IDLE, form({ ...settings, "rate:2026-27": "", projectionCredit: "" }));
    expect(fake.rates).toEqual([]);
    expect(fake.accounts[0].projectionCredit).toBeUndefined();
  });
  it("takes the editable years from the account, not from the request", async () => {
    fake.entries = [{ id: "c1", epfAccountId: "acc", kind: "Contribution", wageMonth: "2026-03", date: "2026-04-01", employee: 1, employer: 1, pension: 0, source: "Passbook" }];
    await saveEpfSettings(IDLE, form({ ...settings, "rate:2031-32": "9", "source:2031-32": "Declared" }));
    expect(fake.rates.map((r) => r.financialYear)).toEqual(["2026-27"]);
  });
  it("doesn't rewrite the account when the monthly credit is unchanged", async () => {
    fake.accounts[0].projectionCredit = 39308;
    await saveEpfSettings(IDLE, form(settings));
    expect(fake.accountWrites).toBe(0);
    await saveEpfSettings(IDLE, form({ ...settings, projectionCredit: "40,000" }));
    expect(fake.accountWrites).toBe(1);
    expect(fake.accounts[0].projectionCredit).toBe(40000);
  });
  it("won't set the rate of a year whose interest is credited", async () => {
    fake.entries = [{ id: "i1", epfAccountId: "acc", kind: "Interest", date: "2026-03-31", employee: 1, employer: 1, pension: 0, source: "Passbook" }];
    await saveEpfSettings(IDLE, form({ ...settings, "rate:2025-26": "9", "source:2025-26": "Declared" }));
    expect(fake.rates.map((r) => r.financialYear)).toEqual(["2026-27"]);
  });
  it("refuses a rate that isn't one and writes nothing", async () => {
    expect(await saveEpfSettings(IDLE, form({ ...settings, "rate:2026-27": "85" }))).toMatchObject({ status: "invalid", errors: { "rate:2026-27": expect.any(String) } });
    expect(fake.rates).toEqual([]);
  });
});
