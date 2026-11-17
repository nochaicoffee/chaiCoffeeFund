/** What one round of a sync reports back: whether it worked, and how many emails it ran out of time for. */
export interface RoundResult {
  /** The HTTP-style outcome: false for an error the next round wouldn't fix. */
  ok: boolean;
  /** "done" when it read what it could; anything else ("already-running") means stop. */
  status: string;
  /** New emails this round ran out of time for. */
  remaining: number;
}

export interface RoundsReport extends RoundResult {
  /** How many rounds ran. */
  rounds: number;
}

export interface RoundsOptions {
  /**
   * No round starts at or after this time (ms since the epoch), so the last one finishes inside the
   * function's time limit. An absolute time, so several syncs in one function can share one deadline.
   */
  startNoLaterThan: number;
  maxRounds: number;
  /** The clock in ms, for tests. */
  now?: () => number;
}

/**
 * Runs a sync again and again, because one call reads only what fits in its time budget (#82).
 * It stops when nothing is left, when a round fails or finds another sync running, when the
 * limit on rounds is reached, or when it is too late to start another. If it is too late for
 * even the first, nothing runs and the status is "not-started". The report is the last
 * round's, plus how many ran.
 */
export async function runInRounds(runOnce: () => Promise<RoundResult>, { startNoLaterThan, maxRounds, now = Date.now }: RoundsOptions): Promise<RoundsReport> {
  let last: RoundResult = { ok: true, status: "not-started", remaining: 0 };
  let rounds = 0;
  while (rounds < maxRounds && now() < startNoLaterThan) {
    last = await runOnce();
    rounds += 1;
    if (!last.ok || last.status !== "done" || last.remaining === 0) break;
  }
  return { ...last, rounds };
}
