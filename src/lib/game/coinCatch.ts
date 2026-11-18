/**
 * Coin catch, the game offered on the wait screen: slide a kulhad under falling ₹. A red EMI slip
 * costs 3. It never ends (a page can arrive any second), so there is no game over, only a score
 * that can't go below zero and a best. Pure: the canvas only draws what this says.
 */

export const CUP_W = 64;
export const EMI_PENALTY = 3;
export const BIG_COIN = 10;
/** How far from the bottom edge the cup's mouth is: a drop counts when it falls through this band over the cup. */
export const CATCH_TOP = 52;
export const CATCH_BOTTOM = 26;
export const MIN_SPAWN_S = 0.36;

export type DropKind = "coin" | "big" | "emi";

export interface Drop {
  id: number;
  x: number;
  y: number;
  /** Pixels per second. */
  v: number;
  kind: DropKind;
}

/** "+1", "-3": shown where a drop was caught, for a moment. */
export interface Flash {
  x: number;
  y: number;
  age: number;
  delta: number;
}

export interface CatchState {
  w: number;
  h: number;
  cupX: number;
  targetX: number;
  drops: Drop[];
  flashes: Flash[];
  spawnIn: number;
  nextId: number;
  score: number;
  best: number;
}

export interface Keys {
  left: boolean;
  right: boolean;
}

export const deltaFor = (kind: DropKind): number => (kind === "emi" ? -EMI_PENALTY : kind === "big" ? BIG_COIN : 1);

export function initGame(w: number, h: number, best = 0): CatchState {
  return { w, h, cupX: w / 2, targetX: w / 2, drops: [], flashes: [], spawnIn: 0.4, nextId: 1, score: 0, best };
}

/** Where the next drop comes after this long, which shrinks as the score grows but never below MIN_SPAWN_S. */
export function spawnInterval(score: number, rng: () => number): number {
  return Math.max(MIN_SPAWN_S, 0.95 - score * 0.012) * (0.8 + rng() * 0.5);
}

/** How fast a drop falls: faster as the score grows (to a cap), scaled to the board's height. */
export function dropSpeed(score: number, h: number): number {
  return (110 + Math.min(score, 60) * 2.4) * (h / 240);
}

export function kindFor(r: number): DropKind {
  return r < 0.14 ? "emi" : r < 0.22 ? "big" : "coin";
}

const clampX = (s: CatchState, x: number) => Math.max(CUP_W / 2, Math.min(s.w - CUP_W / 2, x));

/** Aim the cup at x (a pointer or a finger). It glides there rather than jumping. */
export function aim(s: CatchState, x: number): CatchState {
  return { ...s, targetX: clampX(s, x) };
}

/** Resize the board, keeping the cup where it was in proportion. */
export function resize(s: CatchState, w: number, h: number): CatchState {
  const k = s.w > 0 ? w / s.w : 1;
  const next = { ...s, w, h };
  return { ...next, cupX: clampX(next, s.cupX * k), targetX: clampX(next, s.targetX * k), drops: s.drops.map((d) => ({ ...d, x: d.x * k })) };
}

/** Moves the game on by `dt` seconds. Never mutates `s`. */
export function step(s: CatchState, dt: number, rng: () => number, keys: Keys = { left: false, right: false }): CatchState {
  let targetX = s.targetX;
  if (keys.left) targetX -= 560 * dt;
  if (keys.right) targetX += 560 * dt;
  targetX = clampX(s, targetX);
  const cupX = s.cupX + (targetX - s.cupX) * Math.min(1, dt * 16);

  let { spawnIn, nextId, score } = s;
  const drops: Drop[] = [];
  spawnIn -= dt;
  const incoming: Drop[] = [];
  if (spawnIn <= 0) {
    spawnIn = spawnInterval(score, rng);
    incoming.push({ id: nextId++, x: 20 + rng() * (s.w - 40), y: -16, v: dropSpeed(score, s.h), kind: kindFor(rng()) });
  }

  const flashes = s.flashes.map((f) => ({ ...f, age: f.age + dt, y: f.y - 40 * dt })).filter((f) => f.age < 0.7);
  for (const d of [...s.drops, ...incoming]) {
    const y = d.y + d.v * dt;
    // Whether it passed through the cup's mouth this frame (from where it was to where it is), not just whether it ends inside it: a quick drop or a long frame must not jump over the band.
    const caught = y > s.h - CATCH_TOP && d.y < s.h - CATCH_BOTTOM && Math.abs(d.x - cupX) < CUP_W / 2 + 4;
    if (caught) {
      const delta = deltaFor(d.kind);
      const before = score;
      score = Math.max(0, score + delta);
      flashes.push({ x: d.x, y: s.h - 60, age: 0, delta: score - before });
    } else if (y < s.h + 20) {
      drops.push({ ...d, y });
    }
  }
  return { ...s, cupX, targetX, drops, flashes, spawnIn, nextId, score, best: Math.max(s.best, score) };
}
