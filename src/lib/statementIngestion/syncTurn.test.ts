import { describe, expect, it } from "vitest";
import type { SyncRun } from "../sheets/types";
import { decideSyncTurn, STALE_RUN_MS } from "./syncTurn";

const NOW = Date.parse("2026-10-19T10:00:00.000Z");
const run = (id: string, status: SyncRun["status"], minutesAgo: number): SyncRun => ({
  id,
  trigger: "Manual",
  status,
  startedAt: new Date(NOW - minutesAgo * 60_000).toISOString(),
});

describe("decideSyncTurn", () => {
  it("goes ahead when its own row is the only Running one", () => {
    expect(decideSyncTurn([run("old", "Done", 600), run("me", "Running", 0)], "me", NOW)).toEqual({ goAhead: true, stale: [] });
  });

  it("stands down when an earlier sync is still running", () => {
    expect(decideSyncTurn([run("other", "Running", 2), run("me", "Running", 0)], "me", NOW)).toEqual({
      goAhead: false,
      runningSince: "2026-10-19T09:58:00.000Z",
    });
  });

  it("gives two syncs started together the same answer: the first row runs, the second doesn't", () => {
    const runs = [run("a", "Running", 0), run("b", "Running", 0)];
    expect(decideSyncTurn(runs, "a", NOW).goAhead).toBe(true);
    expect(decideSyncTurn(runs, "b", NOW).goAhead).toBe(false);
  });

  it("ignores a later Running row, and finished or skipped ones", () => {
    const runs = [run("x", "Skipped", 1), run("y", "Failed", 1), run("me", "Running", 0), run("later", "Running", 0)];
    expect(decideSyncTurn(runs, "me", NOW).goAhead).toBe(true);
  });

  it("goes ahead past a sync that has shown Running too long, and returns it to mark as failed", () => {
    const dead = run("dead", "Running", STALE_RUN_MS / 60_000 + 1);
    expect(decideSyncTurn([dead, run("me", "Running", 0)], "me", NOW)).toEqual({ goAhead: true, stale: [dead] });
  });

  it("lets a card sync and an account sync run together: only a sync of the same kind holds one up", () => {
    const accounts = (id: string, minutesAgo: number): SyncRun => ({ ...run(id, "Running", minutesAgo), kind: "Accounts" });
    const cards = (id: string, minutesAgo: number): SyncRun => ({ ...run(id, "Running", minutesAgo), kind: "Cards" });
    expect(decideSyncTurn([cards("c", 1), accounts("a", 0)], "a", NOW).goAhead).toBe(true);
    expect(decideSyncTurn([accounts("a0", 1), accounts("a", 0)], "a", NOW)).toEqual({ goAhead: false, runningSince: "2026-10-19T09:59:00.000Z" });
    // A blank kind, as every row from before the account sync is, is a card sync.
    expect(decideSyncTurn([run("old", "Running", 1), accounts("a", 0)], "a", NOW).goAhead).toBe(true);
    expect(decideSyncTurn([accounts("a", 1), run("me", "Running", 0)], "me", NOW).goAhead).toBe(true);
  });
});
