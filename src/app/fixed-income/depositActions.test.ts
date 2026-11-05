import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, FixedDeposit } from "@/lib/sheets/types";

const fake = vi.hoisted(() => ({ accounts: [] as Account[], deposits: [] as FixedDeposit[], tags: [] as string[], fail: false, n: 0 }));
vi.mock("next/cache", () => ({ updateTag: (tag: string) => fake.tags.push(tag), unstable_cache: <T,>(fn: T) => fn }));
const guard = () => { if (fake.fail) throw new Error("Sheets said no"); };
vi.mock("@/lib/sheets/accounts", () => ({ accountsRepository: { list: async () => fake.accounts } }));
vi.mock("@/lib/sheets/fixedDeposits", async (original) => ({
  ...(await original<object>()),
  fixedDepositsRepository: {
    get: async (id: string) => fake.deposits.find((d) => d.id === id) ?? null,
    create: async (input: Omit<FixedDeposit, "id">) => { guard(); const row = { ...input, id: `fd${++fake.n}` }; fake.deposits.push(row); return row; },
    update: async (id: string, patch: Record<string, unknown>) => {
      guard();
      const row = fake.deposits.find((d) => d.id === id)!;
      // The repository merges the patch over the row; "" and undefined blank a cell, which reads back as unset.
      for (const [k, v] of Object.entries(patch)) { if (v === "" || v === undefined) delete (row as unknown as Record<string, unknown>)[k]; else (row as unknown as Record<string, unknown>)[k] = v; }
      return row;
    },
    remove: async (id: string) => { guard(); fake.deposits = fake.deposits.filter((d) => d.id !== id); },
  },
}));

const { saveDeposit, closeDeposit, reopenDeposit, deleteDeposit, undoDeposit } = await import("./depositActions");
const IDLE = { status: "idle" } as never;
const form = (values: Record<string, string>) => { const d = new FormData(); for (const [k, v] of Object.entries(values)) d.set(k, v); return d; };
const add = { principalAmount: "15,000", interestRate: "7.75", startDate: "2026-11-01", tenureMonths: "18", tenureDays: "1", compoundingType: "Cumulative" };
const held: FixedDeposit = { id: "fd0", name: "FD", principalAmount: 15000, interestRate: 7.75, compoundingType: "Cumulative", startDate: "2026-03-13", maturityDate: "2027-09-14", status: "Active" };

beforeEach(() => { fake.accounts = [{ id: "hdfc", name: "HDFC" } as Account]; fake.deposits = []; fake.tags = []; fake.fail = false; fake.n = 0; });

describe("saveDeposit", () => {
  it("adds a deposit by start and tenure, held, with the maturity day worked out", async () => {
    const result = await saveDeposit(IDLE, form(add));
    expect(result).toMatchObject({ status: "saved", undo: { message: expect.stringContaining("matures May 2, 2028") } });
    expect(fake.deposits[0]).toMatchObject({ principalAmount: 15000, interestRate: 7.75, startDate: "2026-11-01", maturityDate: "2028-05-02", status: "Active", compoundingType: "Cumulative" });
    expect(fake.tags).toEqual(["fixedDeposits"]);
  });
  it("says what's wrong and writes nothing", async () => {
    expect(await saveDeposit(IDLE, form({ ...add, principalAmount: "" }))).toMatchObject({ status: "invalid", errors: { principalAmount: expect.any(String) } });
    expect(fake.deposits).toEqual([]);
  });
  it("edits a deposit that is held, clearing what is left blank", async () => {
    fake.deposits = [{ ...held, bankName: "HDFC", maturityAmount: 17000, payoutFrequency: "Quarterly", compoundingType: "Non-Cumulative" }];
    const result = await saveDeposit(IDLE, form({ ...add, id: "fd0", compoundingType: "Cumulative" }));
    expect(result.status).toBe("saved");
    expect(fake.deposits[0]).toMatchObject({ compoundingType: "Cumulative", startDate: "2026-11-01" });
    expect(fake.deposits[0].bankName).toBeUndefined();
    expect(fake.deposits[0].maturityAmount).toBeUndefined();
    expect(fake.deposits[0].payoutFrequency).toBeUndefined();
  });
  it("won't edit a closed deposit or one that isn't there", async () => {
    fake.deposits = [{ ...held, status: "Closed", closedDate: "2026-06-01", receivedAmount: 16000, closeKind: "Pre-closed" }];
    expect(await saveDeposit(IDLE, form({ ...add, id: "fd0" }))).toMatchObject({ errors: { form: expect.stringMatching(/Reopen it first/) } });
    expect(await saveDeposit(IDLE, form({ ...add, id: "nope" }))).toMatchObject({ errors: { form: expect.stringMatching(/isn't in the Sheet/) } });
  });
  it("says failed when the Sheet does", async () => {
    fake.fail = true;
    expect((await saveDeposit(IDLE, form(add))).status).toBe("failed");
  });
});

describe("closeDeposit and Undo", () => {
  it("closes at maturity with what arrived, and Undo reopens it", async () => {
    fake.deposits = [{ ...held, maturityDate: "2026-11-05" }];
    const result = await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "17,400", closedDate: "2026-11-05" }));
    expect(result).toMatchObject({ status: "saved", undo: { message: expect.stringContaining("matured") } });
    expect(fake.deposits[0]).toMatchObject({ status: "Closed", closedDate: "2026-11-05", receivedAmount: 17400, closeKind: "Matured" });
    const undo = await undoDeposit(result.status === "saved" ? result.undo!.id : "");
    expect(undo).toEqual({ ok: true, message: "Put back as it was." });
    expect(fake.deposits[0].status).toBe("Active");
    expect(fake.deposits[0].closedDate).toBeUndefined();
    expect(fake.deposits[0].receivedAmount).toBeUndefined();
  });
  it("a deposit closed before its maturity day is pre-closed", async () => {
    fake.deposits = [{ ...held }];
    await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "15,900", closedDate: "2026-11-05" }));
    expect(fake.deposits[0].closeKind).toBe("Pre-closed");
  });
  it("refuses a bad close and an already closed deposit", async () => {
    fake.deposits = [{ ...held }];
    expect(await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "", closedDate: "2026-11-05" }))).toMatchObject({ status: "invalid", errors: { receivedAmount: expect.any(String) } });
    expect(fake.deposits[0].status).toBe("Active");
    await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "15,900", closedDate: "2026-11-05" }));
    expect(await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "15,900", closedDate: "2026-11-05" }))).toMatchObject({ errors: { form: expect.stringMatching(/already closed/) } });
  });
  it("Undo leaves a deposit that was reopened and closed again differently", async () => {
    fake.deposits = [{ ...held }];
    const result = await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "15,900", closedDate: "2026-11-05" }));
    await reopenDeposit(IDLE, form({ id: "fd0" }));
    await closeDeposit(IDLE, form({ id: "fd0", receivedAmount: "16,000", closedDate: "2026-11-04" }));
    const undo = await undoDeposit(result.status === "saved" ? result.undo!.id : "");
    expect(undo.ok).toBe(false);
    expect(fake.deposits[0].status).toBe("Closed");
  });
});

describe("Undo of an add, reopen and delete", () => {
  it("removes the deposit just added, but not one changed since", async () => {
    const result = await saveDeposit(IDLE, form(add));
    const tokenFor = result.status === "saved" ? result.undo!.id : "";
    expect(await undoDeposit(tokenFor)).toEqual({ ok: true, message: "Put back as it was." });
    expect(fake.deposits).toEqual([]);
    const again = await saveDeposit(IDLE, form(add));
    await saveDeposit(IDLE, form({ ...add, id: "fd2", principalAmount: "20,000" }));
    expect((await undoDeposit(again.status === "saved" ? again.undo!.id : "")).ok).toBe(false);
    expect(fake.deposits).toHaveLength(1);
    expect((await undoDeposit("not a token")).ok).toBe(false);
  });
  it("Undo of an add leaves a deposit whose rate or term was corrected since", async () => {
    const result = await saveDeposit(IDLE, form(add));
    const tokenFor = result.status === "saved" ? result.undo!.id : "";
    await saveDeposit(IDLE, form({ ...add, id: "fd1", interestRate: "8" }));
    expect((await undoDeposit(tokenFor)).ok).toBe(false);
    expect(fake.deposits).toHaveLength(1);
  });
  it("reopens and deletes", async () => {
    fake.deposits = [{ ...held, status: "Closed", closedDate: "2026-06-01", receivedAmount: 16000, closeKind: "Pre-closed" }];
    expect((await reopenDeposit(IDLE, form({ id: "fd0" }))).status).toBe("saved");
    expect(fake.deposits[0].status).toBe("Active");
    expect((await deleteDeposit(IDLE, form({ id: "fd0" }))).status).toBe("saved");
    expect(fake.deposits).toEqual([]);
    expect((await deleteDeposit(IDLE, form({}))).status).toBe("invalid");
  });
});
