import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, BalanceSnapshot } from "@/lib/sheets/types";

/**
 * Where a balance came from, as the Accounts forms keep it: a balance typed in by hand is Manual, even when it
 * replaces one a bank statement gave, so Balance history never says "from a statement" about a figure someone typed.
 */
const fake = vi.hoisted(() => ({
  snapshots: [] as BalanceSnapshot[],
  updates: [] as { id: string; patch: Partial<BalanceSnapshot> }[],
  creates: [] as Omit<BalanceSnapshot, "id">[],
  /** Each call to the Sheet, in order: "update" and "create" are one call however many rows they carry. */
  calls: [] as string[],
  failCreate: false,
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), unstable_cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/sheets/accounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sheets/accounts")>()),
  accountsRepository: {
    list: async () =>
      ["slice", "hdfc", "jupiter"].map((id) => ({ id, name: id, bank: id, accountType: "Savings", purpose: "Spending", startDate: "2025-01-01", status: "Active" }) satisfies Account),
  },
}));
vi.mock("@/lib/sheets/balanceSnapshots", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sheets/balanceSnapshots")>()),
  balanceSnapshotsRepository: {
    // A copy, as the real repository's list() is: the action adds to what it read, and that must not reach the Sheet's rows.
    list: async () => fake.snapshots.map((s) => ({ ...s })),
    update: async (id: string, patch: Partial<BalanceSnapshot>) => {
      fake.calls.push("update");
      fake.updates.push({ id, patch });
      return Object.assign(fake.snapshots.find((s) => s.id === id)!, patch);
    },
    updateMany: async (changes: { id: string; patch: Partial<BalanceSnapshot> }[]) => {
      fake.calls.push("updateMany");
      return changes.map(({ id, patch }) => {
        fake.updates.push({ id, patch });
        return Object.assign(fake.snapshots.find((s) => s.id === id)!, patch);
      });
    },
    create: async (input: Omit<BalanceSnapshot, "id">) => {
      fake.calls.push("create");
      fake.creates.push(input);
      return { ...input, id: `new${fake.creates.length}` };
    },
    createMany: async (inputs: Omit<BalanceSnapshot, "id">[]) => {
      fake.calls.push("createMany");
      if (fake.failCreate) throw new Error("append failed");
      return inputs.map((input) => {
        fake.creates.push(input);
        const row = { ...input, id: `new${fake.creates.length}` };
        fake.snapshots.push(row);
        return row;
      });
    },
  },
}));
vi.mock("@/lib/sheets/loans", () => ({ loansRepository: { list: async () => [] } }));

const { saveBalance, saveBalanceEdit, saveCheckIn } = await import("./actions");
const IDLE = { status: "idle" } as never;
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => {
  fake.snapshots = [{ id: "s1", accountId: "slice", date: "2026-09-30", balance: 100, source: "Statement" }];
  fake.updates = [];
  fake.creates = [];
  fake.calls = [];
  fake.failCreate = false;
});

describe("a balance's source", () => {
  it("a balance typed over a statement's becomes Manual", async () => {
    expect((await saveBalance(IDLE, form({ accountId: "slice", date: "2026-09-30", balance: "110" }))).status).toBe("saved");
    expect(fake.updates).toEqual([{ id: "s1", patch: { balance: 110, source: "Manual" } }]);
  });

  it("a new balance typed in is Manual", async () => {
    await saveBalance(IDLE, form({ accountId: "slice", date: "2026-10-05", balance: "120" }));
    expect(fake.creates).toEqual([{ accountId: "slice", date: "2026-10-05", balance: 120, source: "Manual" }]);
  });

  it("editing a statement's balance to another amount makes it Manual, but moving it to another day does not", async () => {
    await saveBalanceEdit(IDLE, form({ id: "s1", date: "2026-09-30", balance: "105" }));
    expect(fake.updates[0].patch).toMatchObject({ balance: 105, source: "Manual" });
    fake.updates = [];
    fake.snapshots = [{ id: "s1", accountId: "slice", date: "2026-09-30", balance: 100, source: "Statement" }];
    await saveBalanceEdit(IDLE, form({ id: "s1", date: "2026-09-29", balance: "100" }));
    expect(fake.updates[0].patch).toEqual({ date: "2026-09-29", balance: 100 });
  });
});

describe("the monthly check-in", () => {
  it("writes any number of balances in one update call and one append, however many accounts", async () => {
    fake.snapshots = [
      { id: "s1", accountId: "slice", date: "2026-11-05", balance: 100, source: "Statement" },
      { id: "s2", accountId: "hdfc", date: "2026-11-05", balance: 200, source: "Manual" },
    ];
    const result = await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "110", "balance:hdfc": "210", "balance:jupiter": "310" }));
    expect(result.status).toBe("saved");
    // Two replaced and one added: three rows, two Sheet calls (the single-row update and create are never used).
    expect(fake.calls).toEqual(["updateMany", "createMany"]);
    expect(fake.updates).toEqual([
      { id: "s1", patch: { balance: 110, source: "Manual" } },
      { id: "s2", patch: { balance: 210, source: "Manual" } },
    ]);
    expect(fake.creates).toEqual([{ accountId: "jupiter", date: "2026-11-05", balance: 310, source: "Manual" }]);
  });

  it("makes no call for what it has no rows of: all new means one append, all replaced means one update", async () => {
    await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "1", "balance:hdfc": "2" }));
    expect(fake.calls).toEqual(["createMany"]);
    expect(fake.creates).toHaveLength(2);
    fake.calls = [];
    fake.snapshots = [{ id: "s1", accountId: "slice", date: "2026-11-05", balance: 100, source: "Manual" }];
    await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "5" }));
    expect(fake.calls).toEqual(["updateMany"]);
  });

  it("leaves blank accounts alone", async () => {
    await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "", "balance:hdfc": "2" }));
    expect(fake.creates.map((c) => c.accountId)).toEqual(["hdfc"]);
  });

  it("says saving again is safe when the append fails after the updates went through, and the retry doubles nothing", async () => {
    fake.snapshots = [{ id: "s1", accountId: "slice", date: "2026-11-05", balance: 100, source: "Manual" }];
    fake.failCreate = true;
    const failed = await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "110", "balance:hdfc": "210" }));
    expect(failed).toMatchObject({ status: "failed" });
    expect(failed.status === "failed" && failed.message).toMatch(/If some balances did go in, saving again replaces them/);
    expect(fake.snapshots[0].balance).toBe(110);
    // Try again: the replaced one is replaced again, the new one is added once.
    fake.failCreate = false;
    expect((await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "110", "balance:hdfc": "210" }))).status).toBe("saved");
    expect(fake.creates).toEqual([{ accountId: "hdfc", date: "2026-11-05", balance: 210, source: "Manual" }]);
    // And saving the same check-in once more adds nothing: every balance is now a replacement.
    fake.calls = [];
    await saveCheckIn(IDLE, form({ date: "2026-11-05", "balance:slice": "110", "balance:hdfc": "210" }));
    expect(fake.calls).toEqual(["updateMany"]);
    expect(fake.snapshots.filter((s) => s.accountId === "hdfc")).toHaveLength(1);
  });
});
