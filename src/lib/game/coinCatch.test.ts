import { describe, expect, it } from "vitest";
import { aim, BIG_COIN, CATCH_BOTTOM, CATCH_TOP, CUP_W, deltaFor, dropSpeed, EMI_PENALTY, initGame, kindFor, MIN_SPAWN_S, resize, spawnInterval, step, type CatchState, type Drop } from "./coinCatch";

const never = () => 0.5;
const board = (best = 0): CatchState => ({ ...initGame(400, 240, best), spawnIn: 99 });
/** A drop that is about to fall through the cup's mouth at x. */
const dropAt = (x: number, kind: Drop["kind"], h = 240): Drop => ({ id: 1, x, y: h - CATCH_TOP - 1, v: 100, kind });
const fall = (s: CatchState, d: Drop) => step({ ...s, drops: [d] }, 0.05, never);

describe("Coin catch", () => {
  it("scores a coin that falls into the cup, a big one ten, and takes three for an EMI slip", () => {
    const s = board();
    expect(fall(s, dropAt(200, "coin")).score).toBe(1);
    expect(fall(s, dropAt(200, "big")).score).toBe(BIG_COIN);
    expect(fall({ ...s, score: 7 }, dropAt(200, "emi")).score).toBe(7 - EMI_PENALTY);
  });

  it("never goes below zero, and shows the change that really happened", () => {
    const after = fall(board(), dropAt(200, "emi"));
    expect(after.score).toBe(0);
    expect(after.flashes[0].delta).toBe(0);
    expect(fall({ ...board(), score: 1 }, dropAt(200, "emi")).flashes[0].delta).toBe(-1);
  });

  it("ignores a drop that falls beside the cup, and lets it leave the board", () => {
    const miss = fall(board(), dropAt(40, "coin"));
    expect(miss.score).toBe(0);
    expect(miss.drops).toHaveLength(1);
    const gone = step({ ...board(), drops: [{ id: 1, x: 40, y: 270, v: 100, kind: "coin" }] }, 0.05, never);
    expect(gone.drops).toHaveLength(0);
    expect(gone.score).toBe(0);
  });

  it("counts a drop once: it is gone after it is caught", () => {
    const once = fall(board(), dropAt(200, "coin"));
    expect(once.drops).toHaveLength(0);
    expect(step(once, 0.05, never).score).toBe(1);
  });

  it("only catches inside the cup's mouth, not above or below it", () => {
    const s = board();
    const h = 240;
    expect(step({ ...s, drops: [{ id: 1, x: 200, y: h - CATCH_TOP - 30, v: 10, kind: "coin" }] }, 0.05, never).score).toBe(0);
    expect(step({ ...s, drops: [{ id: 1, x: 200, y: h - CATCH_BOTTOM + 5, v: 10, kind: "coin" }] }, 0.05, never).score).toBe(0);
  });

  it("catches a drop that jumps over the whole mouth in one frame, on a tall board or a slow frame", () => {
    const tall = { ...initGame(400, 1000), spawnIn: 99 };
    const fast: Drop = { id: 1, x: 200, y: 1000 - CATCH_TOP - 80, v: 3000, kind: "coin" };
    expect(step({ ...tall, drops: [fast] }, 0.05, never).score).toBe(1);
    // One that was already below the mouth is not caught on the way past.
    expect(step({ ...tall, drops: [{ ...fast, y: 1000 - CATCH_BOTTOM + 3 }] }, 0.05, never).score).toBe(0);
  });

  it("keeps the best score, even after the score falls", () => {
    let s = board(5);
    s = fall({ ...s, score: 5 }, dropAt(200, "big"));
    expect(s.score).toBe(15);
    expect(s.best).toBe(15);
    s = fall(s, dropAt(200, "emi"));
    expect(s.score).toBe(12);
    expect(s.best).toBe(15);
  });

  it("keeps the cup on the board and moves it with the keys or a pointer", () => {
    let s = aim(board(), -500);
    expect(s.targetX).toBe(CUP_W / 2);
    s = aim(s, 9999);
    expect(s.targetX).toBe(400 - CUP_W / 2);
    const left = step(board(), 0.1, never, { left: true, right: false });
    expect(left.targetX).toBeLessThan(200);
    let glide = aim(board(), 360);
    glide = step(glide, 0.016, never);
    expect(glide.cupX).toBeGreaterThan(200);
    expect(glide.cupX).toBeLessThan(360);
  });

  it("never mutates the state it was given", () => {
    const s = { ...board(), drops: [dropAt(200, "coin")] };
    const frozen = JSON.stringify(s);
    step(s, 0.05, never);
    expect(JSON.stringify(s)).toBe(frozen);
  });

  it("drops things in from the top at a pace that quickens but has a floor and a cap", () => {
    const s = { ...initGame(400, 240), spawnIn: 0 };
    const next = step(s, 0.01, never);
    expect(next.drops).toHaveLength(1);
    expect(next.drops[0].y).toBeLessThan(0);
    expect(spawnInterval(0, never)).toBeGreaterThan(spawnInterval(40, never));
    expect(spawnInterval(10_000, () => 0)).toBeCloseTo(MIN_SPAWN_S * 0.8);
    expect(dropSpeed(10, 240)).toBeGreaterThan(dropSpeed(0, 240));
    expect(dropSpeed(10_000, 240)).toBe(dropSpeed(60, 240));
    expect(dropSpeed(0, 480)).toBe(dropSpeed(0, 240) * 2);
  });

  it("makes mostly coins, some big ones and some EMI slips", () => {
    expect(kindFor(0)).toBe("emi");
    expect(kindFor(0.2)).toBe("big");
    expect(kindFor(0.9)).toBe("coin");
    expect([deltaFor("coin"), deltaFor("big"), deltaFor("emi")]).toEqual([1, BIG_COIN, -EMI_PENALTY]);
  });

  it("keeps the cup and the falling drops in proportion when the board is resized", () => {
    const s = { ...board(), cupX: 100, targetX: 100, drops: [dropAt(100, "coin")] };
    const wide = resize(s, 800, 240);
    expect(wide.cupX).toBe(200);
    expect(wide.drops[0].x).toBe(200);
  });

  it("is the same game for the same dice", () => {
    const run = () => {
      let n = 0;
      const rng = () => ((n = (n * 9301 + 49297) % 233280) || 1) / 233280;
      let s = initGame(400, 240);
      for (let i = 0; i < 600; i++) s = step(s, 1 / 60, rng);
      return s.drops.map((d) => [d.kind, Math.round(d.x)]);
    };
    expect(run()).toEqual(run());
  });
});
