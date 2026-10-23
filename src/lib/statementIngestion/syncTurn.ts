import type { SyncRun } from "../sheets/types";

/**
 * How long a sync can show as Running before it's taken to have died, say cut off by a host's time
 * limit. A live one finishes in about a minute (a 45-second budget, then its writes), so 5 is plenty.
 */
export const STALE_RUN_MS = 5 * 60 * 1000;

export type SyncTurn = { goAhead: true; stale: SyncRun[] } | { goAhead: false; runningSince: string };

/**
 * Whether this sync goes ahead, decided once it has added its own Running row
 * to SyncRuns and read the tab back. The earliest live Running row wins. Every
 * sync adds its row before reading and the Sheet keeps added rows in one order,
 * so two syncs started together agree on which is first, and only that one runs.
 * Running rows older than STALE_RUN_MS are left out, and returned so the winner
 * can mark them failed.
 */
export function decideSyncTurn(runs: SyncRun[], mine: string, now: number): SyncTurn {
  // Card and account syncs are separate (a blank kind is a card sync, from before there was one), so only
  // syncs of this one's kind hold it up.
  const kindOf = (run: SyncRun) => run.kind ?? "Cards";
  const mineRun = runs.find((run) => run.id === mine);
  const kind = mineRun ? kindOf(mineRun) : "Cards";
  const running = runs.filter((run) => run.status === "Running" && kindOf(run) === kind);
  const isStale = (run: SyncRun) => run.id !== mine && now - Date.parse(run.startedAt) > STALE_RUN_MS;
  const first = running.find((run) => !isStale(run));
  if (first && first.id !== mine) return { goAhead: false, runningSince: first.startedAt };
  return { goAhead: true, stale: running.filter(isStale) };
}
