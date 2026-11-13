import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const rows = vi.hoisted(() => [{ id: "1", accountId: "a", date: "2026-11-01", balance: 100 }]);
vi.mock("./balanceSnapshots", () => ({ balanceSnapshotsRepository: { list: async () => rows } }));

const { balanceSnapshotGuards } = await import("./balanceGuards");


describe("balanceSnapshotGuards", () => {
  it("refuses a second balance for an account's day on create", async () => {
    expect(await balanceSnapshotGuards.beforeCreate!({ accountId: "a", date: "2026-11-01", balance: 5 })).toContain("already has a balance");
    expect(await balanceSnapshotGuards.beforeCreate!({ accountId: "a", date: "2026-11-02", balance: 5 })).toBeNull();
  });

  it("checks the merged row on update, so moving a balance onto a taken day is refused", async () => {
    expect(await balanceSnapshotGuards.beforeUpdate!("1", { balance: 7 })).toBeNull();
    rows.push({ id: "2", accountId: "a", date: "2026-11-02", balance: 1 });
    expect(await balanceSnapshotGuards.beforeUpdate!("2", { date: "2026-11-01" })).toContain("(id 1)");
    rows.pop();
  });

  it("leaves a missing row to the repository's own 404", async () => {
    expect(await balanceSnapshotGuards.beforeUpdate!("zzz", { date: "2026-11-01" })).toBeNull();
  });
});
