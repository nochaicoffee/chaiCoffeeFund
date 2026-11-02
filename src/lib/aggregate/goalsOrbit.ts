import { dueOf, fundingOrder, kidsOf, liveKids, monthsLeft, requiredFor, savedOwn, topGoals, unitKey, type FundingUnit, type GoalsData } from "./goals";
import type { Goal } from "../sheets/types";

/**
 * What the Orbit sky draws (docs/design/goals.md, "The pick"): one planet per piece of a goal. A goal with no sub-goals is one piece; a
 * parent is its own part (when it has one) and each live sub-goal, so the car upgrade is five planets of one colour, each on the ring of its
 * own date. Pure, so the same goals always give the same sky.
 */

/** A ring: months left to the date (1 up to MAX_RING_MONTHS), `OVERDUE` for a date that has passed, `SOMEDAY` for no date or a paused goal. */
export const OVERDUE_RING = 0;
export const SOMEDAY_RING = 99;
/** A date further out than this sits on the last ring, so a long goal never leaves the sky. */
export const MAX_RING_MONTHS = 36;

export interface SkyPiece {
  /** Unique: a parent's own part carries `#own` after the goal's id. */
  key: string;
  goalId: string;
  /** The top-level goal it sits under, which picking it opens. */
  topId: string;
  name: string;
  /** The goal's name when this piece is a sub-goal or a parent's own part; null for a goal on its own. */
  parentName: string | null;
  own: boolean;
  necessity: Goal["necessity"];
  dateType: "Fixed" | "Flexible";
  due: string | null;
  amount: number;
  saved: number;
  left: number;
  planned: number;
  /** What it needs a month, over the months left. */
  required: number;
  ring: number;
  paused: boolean;
}

/** The ring a piece sits on: paused or undated is someday, a past date is overdue, otherwise the months left (capped at 36). */
export function ringOf(due: string | null, paused: boolean, today: string): number {
  if (paused || !due) return SOMEDAY_RING;
  if (due < today) return OVERDUE_RING;
  return Math.min(MAX_RING_MONTHS, Math.max(1, monthsLeft(due, today)));
}

/** Every piece of every open top-level goal (Active or Paused), in the funding order (undated and paused last). */
export function skyPieces(data: GoalsData, today: string): SkyPiece[] {
  const pieces = topGoals(data)
    .filter((goal) => goal.status === "Active" || goal.status === "Paused")
    .flatMap((goal): SkyPiece[] => {
      const goalPaused = goal.status === "Paused";
      const kids = liveKids(data, goal.id);
      const parentDue = dueOf(data, goal);
      const make = (g: Goal, own: boolean, due: string | null, parentName: string | null): SkyPiece => {
        const saved = savedOwn(data, g.id);
        const paused = goalPaused || g.status === "Paused";
        const left = Math.max(0, g.amount - saved);
        return {
          key: own ? `${g.id}#own` : g.id,
          goalId: g.id,
          topId: goal.id,
          name: own ? `${g.name}: the rest` : g.name,
          parentName,
          own,
          necessity: g.necessity,
          dateType: g.dateType ?? "Flexible",
          due,
          amount: g.amount,
          saved,
          left,
          planned: paused ? 0 : (g.plannedMonthly ?? 0),
          required: paused ? 0 : requiredFor(left, due, today),
          ring: ringOf(due, paused, today),
          paused,
        };
      };
      if (!kidsOf(data, goal.id).length) return [make(goal, false, goal.targetDate ?? null, null)];
      return [...(goal.amount > 0 ? [make(goal, true, goal.targetDate ?? parentDue, goal.name)] : []), ...kids.map((kid) => make(kid, false, kid.targetDate ?? parentDue, goal.name))];
    });
  const rank = new Map(fundingOrder(pieces.filter((p) => !p.paused && p.due).map(asUnit)).map((unit, index) => [unitKey(unit), index]));
  return pieces.sort((a, b) => (rank.get(a.key) ?? 1e6) - (rank.get(b.key) ?? 1e6) || a.name.localeCompare(b.name));
}

const asUnit = (piece: SkyPiece): FundingUnit => ({ id: piece.goalId, topId: piece.topId, name: piece.name, necessity: piece.necessity, dateType: piece.dateType, due: piece.due, left: piece.left, own: piece.own });

/** The sky is drawn on a 780-unit square; a ring's radius grows with the square root of its months so the near rings aren't crammed. */
export const SKY_SIZE = 780;
export const ringRadius = (ring: number): number => 104 + 38 * Math.sqrt(ring === SOMEDAY_RING ? 40 : Math.min(ring, MAX_RING_MONTHS));
/** A planet's radius in the same units: bigger amount, bigger planet. */
export const planetRadius = (amount: number): number => 7 + Math.sqrt(amount) / 22;

/** The angle band at the top of the sky (degrees, 0 is right and 90 is down) kept clear for the ring labels. */
export const LABEL_BAND = { from: 254, to: 286 } as const;

const GOLDEN_ANGLE = 137.508;

/** A golden-angle spread of the circle without the band under the ring labels, so none can fall in it. */
export function orbitAngle(index: number): number {
  const width = LABEL_BAND.to - LABEL_BAND.from;
  const raw = (index * GOLDEN_ANGLE + 20) % (360 - width);
  return raw >= LABEL_BAND.from ? raw + width : raw;
}

const centre = SKY_SIZE / 2;
const at = (ring: number, angle: number) => ({ x: centre + ringRadius(ring) * Math.cos((angle * Math.PI) / 180), y: centre + ringRadius(ring) * Math.sin((angle * Math.PI) / 180) });

/** A planet's name is two lines under it (above it near the bottom edge): this wide, this tall, and this far from the planet. */
const NAME_WIDTH = 104;
const NAME_HEIGHT = 32;
const NAME_GAP = 9;
const PAD = 4;

interface Box { left: number; right: number; top: number; bottom: number }
const overlaps = (a: Box, b: Box) => a.left < b.right + PAD && b.left < a.right + PAD && a.top < b.bottom + PAD && b.top < a.bottom + PAD;

/** Whether a planet's name goes above it: there's no room for it below. */
export const nameAbove = (y: number, radius: number): boolean => y + radius + NAME_GAP + NAME_HEIGHT > SKY_SIZE - 6;

function boxesOf(x: number, y: number, r: number): Box[] {
  const planet = { left: x - r, right: x + r, top: y - r, bottom: y + r };
  const above = nameAbove(y, r);
  const name = { left: x - NAME_WIDTH / 2, right: x + NAME_WIDTH / 2, top: above ? y - r - NAME_GAP - NAME_HEIGHT : y + r + NAME_GAP, bottom: above ? y - r - NAME_GAP : y + r + NAME_GAP + NAME_HEIGHT };
  return [planet, name];
}

export interface Placement {
  /** Degrees round the ring: 0 is right and 90 is down. */
  angle: number;
  /** Whether the planet's name goes above it. */
  nameAbove: boolean;
}

/**
 * Where each planet sits round its ring so no two planets or their names touch. Each piece, in the sky's order, starts at its golden-angle
 * spot and moves a few degrees either way until it's clear of the planets and names already placed; if the ring is too crowded it keeps its
 * spot. The pieces and their order are the only input, so the same sky always draws the same way.
 */
export function placePlanets(planets: { ring: number; radius: number }[]): Placement[] {
  const placed: Box[] = [];
  return planets.map((planet, index) => {
    const start = orbitAngle(index);
    let chosen = start;
    for (let step = 0; step <= 360; step += 3) {
      const found = [step, -step].map((offset) => (start + offset + 360) % 360).find((angle) => {
        if (angle >= LABEL_BAND.from && angle <= LABEL_BAND.to) return false;
        // The someday ring's label sits at the bottom of the sky.
        if (planet.ring === SOMEDAY_RING && angle >= 70 && angle <= 110) return false;
        const { x, y } = at(planet.ring, angle);
        return boxesOf(x, y, planet.radius).every((box) => placed.every((other) => !overlaps(box, other)));
      });
      if (found !== undefined) {
        chosen = found;
        break;
      }
    }
    const { x, y } = at(planet.ring, chosen);
    placed.push(...boxesOf(x, y, planet.radius));
    return { angle: chosen, nameAbove: nameAbove(y, planet.radius) };
  });
}
