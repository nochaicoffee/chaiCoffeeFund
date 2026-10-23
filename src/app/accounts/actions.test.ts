import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, BalanceSnapshot } from "@/lib/sheets/types";

/**
 * Where a balance came from, as the Accounts forms keep it: a balance typed in by hand is Manual, even when it
 * replaces one a bank statement gave, so Balance history never says "from a statement" about a figure someone typed.
 */
const fake = vi.hoisted(() => ({ snapshots: [] as BalanceSnapshot[], updates: [] as { id: string; patch: Partial<BalanceSnapshot> }[], creates: [] as Omit<BalanceSnapshot, "id">[] }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), unstable_cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/sheets/accounts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sheets/accounts")>()),
  accountsRepository: { list: async () => [{ id: "slice", name: "Slice", bank: "Slice", accountType: "Savings", purpose: "Spending", startDate: "2025-01-01", status: "Active" } satisfies Account] },
}));
vi.mock("@/lib/sheets/balanceSnapshots", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sheets/balanceSnapshots")>()),
  balanceSnapshotsRepository: {
    list: async () => fake.snapshots,
    update: async (id: string, patch: Partial<BalanceSnapshot>) => {
      fake.updates.push({ id, patch });
      return Object.assign(fake.snapshots.find((s) => s.id === id)!, patch);
    },
    create: async (input: Omit<BalanceSnapshot, "id">) => {
      fake.creates.push(input);
      return { ...input, id: `new${fake.creates.length}` };
    },
  },
}));
vi.mock("@/lib/sheets/loans", () => ({ loansRepository: { list: async () => [] } }));

const { saveBalance, saveBalanceEdit } = await import("./actions");
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
