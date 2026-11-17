import { describe, expect, it } from "vitest";
import { runInRounds, type RoundResult } from "./rounds";

const done = (remaining: number): RoundResult => ({ ok: true, status: "done", remaining });

/** Runs `results` in order; the clock advances by `step` ms per call so time passes. */
function harness(results: RoundResult[], step = 0) {
  let time = 0;
  let calls = 0;
  return {
    run: (options: { startNoLaterThan?: number; maxRounds?: number } = {}) =>
      runInRounds(
        async () => {
          time += step;
          return results[Math.min(calls++, results.length - 1)];
        },
        { startNoLaterThan: 100, maxRounds: 10, ...options, now: () => time },
      ),
    calls: () => calls,
  };
}

describe("runInRounds", () => {
  it("runs once when nothing is left", async () => {
    const h = harness([done(0)]);
    expect(await h.run()).toEqual({ ok: true, status: "done", remaining: 0, rounds: 1 });
  });

  it("goes on while emails are left, and stops when none are", async () => {
    const h = harness([done(5), done(2), done(0)]);
    expect(await h.run()).toMatchObject({ remaining: 0, rounds: 3 });
    expect(h.calls()).toBe(3);
  });

  it("stops at the round limit and says how many are left", async () => {
    const h = harness([done(9)]);
    expect(await h.run({ maxRounds: 4 })).toMatchObject({ remaining: 9, rounds: 4 });
  });

  it("starts no new round once the deadline has passed", async () => {
    const h = harness([done(9)], 40);
    // Rounds start at 0, 40 and 80; the clock reads 120 after the third, which is past 100.
    expect(await h.run({ startNoLaterThan: 100 })).toMatchObject({ remaining: 9, rounds: 3 });
  });

  it("runs nothing, and says so, when the deadline has already passed", async () => {
    const h = harness([done(9)]);
    expect(await h.run({ startNoLaterThan: 0 })).toEqual({ ok: true, status: "not-started", remaining: 0, rounds: 0 });
    expect(h.calls()).toBe(0);
  });

  it("stops on a failure or another sync running, reporting it", async () => {
    expect(await harness([done(3), { ok: false, status: "done", remaining: 3 }]).run()).toMatchObject({ ok: false, rounds: 2 });
    expect(await harness([done(3), { ok: true, status: "already-running", remaining: 0 }]).run()).toMatchObject({ status: "already-running", rounds: 2 });
  });
});
