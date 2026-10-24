import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BalanceReview, BalanceSnapshot } from "@/lib/sheets/types";

const fake = vi.hoisted(() => ({ reviews: [] as BalanceReview[], snapshots: [] as BalanceSnapshot[], tags: [] as string[], writes: [] as string[], failReviewUpdate: false }));
// cached.ts (where the tags live) wraps its reads in unstable_cache when it loads.
vi.mock("next/cache", () => ({ updateTag: (tag: string) => fake.tags.push(tag), unstable_cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/sheets/balanceReviews", () => ({
  balanceReviewsRepository: {
    get: async (id: string) => fake.reviews.find((r) => r.id === id) ?? null,
    update: async (id: string, patch: Partial<BalanceReview>) => {
      if (fake.failReviewUpdate) throw new Error("Sheets said no");
      fake.writes.push("review.update");
      return Object.assign(fake.reviews.find((r) => r.id === id)!, patch);
    },
  },
}));
vi.mock("@/lib/sheets/balanceSnapshots", () => ({
  balanceSnapshotsRepository: {
    list: async () => fake.snapshots,
    update: async (id: string, patch: Partial<BalanceSnapshot>) => {
      fake.writes.push("snapshot.update");
      return Object.assign(fake.snapshots.find((s) => s.id === id)!, patch);
    },
    create: async (input: Omit<BalanceSnapshot, "id">) => {
      fake.writes.push("snapshot.create");
      const row = { ...input, id: `new${fake.snapshots.length}` };
      fake.snapshots.push(row);
      return row;
    },
  },
}));

const { resolveBalanceReview } = await import("./reviewActions");
const IDLE = { status: "idle" } as never;
const form = (id: string, choice: string) => {
  const data = new FormData();
  data.set("id", id);
  data.set("choice", choice);
  return data;
};
const review = (overrides: Partial<BalanceReview> = {}): BalanceReview => ({ id: "r1", accountId: "slice", date: "2026-08-31", snapshotId: "s1", recordedBalance: 790, statementBalance: 800, messageId: "m", status: "Open", createdAt: "2026-10-23T06:00:00Z", ...overrides });

beforeEach(() => {
  fake.reviews = [review()];
  fake.snapshots = [{ id: "s1", accountId: "slice", date: "2026-08-31", balance: 790 }];
  fake.tags = [];
  fake.writes = [];
  fake.failReviewUpdate = false;
});

describe("resolveBalanceReview", () => {
  it("accepting writes the statement's balance over the recorded one, marks it from a statement, then closes the review", async () => {
    expect((await resolveBalanceReview(IDLE, form("r1", "accept"))).status).toBe("saved");
    expect(fake.snapshots[0]).toMatchObject({ balance: 800, source: "Statement" });
    expect(fake.reviews[0]).toMatchObject({ status: "Accepted" });
    expect(fake.reviews[0].resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(fake.writes).toEqual(["snapshot.update", "review.update"]);
    expect(fake.tags).toEqual(["balanceSnapshots", "balanceReviews"]);
  });

  it("keeping changes no balance, and closes the review", async () => {
    await resolveBalanceReview(IDLE, form("r1", "keep"));
    expect(fake.snapshots[0].balance).toBe(790);
    expect(fake.reviews[0].status).toBe("Kept");
    expect(fake.writes).toEqual(["review.update"]);
  });

  it("accepting when the recorded balance has since been deleted writes the statement's balance for that day", async () => {
    fake.snapshots = [];
    await resolveBalanceReview(IDLE, form("r1", "accept"));
    expect(fake.snapshots).toEqual([expect.objectContaining({ accountId: "slice", date: "2026-08-31", balance: 800, source: "Statement" })]);
  });

  it("accepting finds the day's balance even if it was re-entered under another id", async () => {
    fake.snapshots = [{ id: "other", accountId: "slice", date: "2026-08-31", balance: 795 }];
    await resolveBalanceReview(IDLE, form("r1", "accept"));
    expect(fake.snapshots).toHaveLength(1);
    expect(fake.snapshots[0]).toMatchObject({ id: "other", balance: 800 });
  });

  it("does not write over the balance the review named if it has since been moved to another day", async () => {
    fake.snapshots = [{ id: "s1", accountId: "slice", date: "2026-09-05", balance: 790 }];
    await resolveBalanceReview(IDLE, form("r1", "accept"));
    expect(fake.snapshots).toHaveLength(2);
    expect(fake.snapshots.find((s) => s.id === "s1")).toMatchObject({ date: "2026-09-05", balance: 790 });
    expect(fake.snapshots.find((s) => s.id !== "s1")).toMatchObject({ date: "2026-08-31", balance: 800 });
  });

  it("does nothing for a review already answered, so a second tab can't undo the first", async () => {
    fake.reviews = [review({ status: "Kept" })];
    await resolveBalanceReview(IDLE, form("r1", "accept"));
    expect(fake.writes).toEqual([]);
    expect(fake.snapshots[0].balance).toBe(790);
  });

  it("says the question is gone for an unknown review or a choice that isn't one", async () => {
    expect((await resolveBalanceReview(IDLE, form("nope", "accept"))).status).toBe("invalid");
    expect((await resolveBalanceReview(IDLE, form("r1", "shrug"))).status).toBe("invalid");
    expect(fake.writes).toEqual([]);
  });

  it("if closing the review fails after the balance was written, reports a failure and leaves the review open to answer again", async () => {
    fake.failReviewUpdate = true;
    expect((await resolveBalanceReview(IDLE, form("r1", "accept"))).status).toBe("failed");
    expect(fake.reviews[0].status).toBe("Open");
    fake.failReviewUpdate = false;
    expect((await resolveBalanceReview(IDLE, form("r1", "accept"))).status).toBe("saved");
    expect(fake.snapshots).toHaveLength(1);
  });
});
