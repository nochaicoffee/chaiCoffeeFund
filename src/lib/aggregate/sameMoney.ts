/**
 * What the same money would be worth somewhere else (design: "The same money, somewhere else"): each buy and each sale put into, or taken out of,
 * a line on its own day, and grown with the line since. `levels` is the line a day (an index, or a deposit), `flows` the money put in that day
 * less what was taken out, in rupees. A day with no level carries the money without growth; money that arrived before the line has any level
 * can't be placed in it, so the answer is then null rather than a figure that leaves it out. A counterfactual, never advice.
 */
export function sameMoneyIn(levels: (number | null)[], flows: number[]): number | null {
  let value = 0;
  let previous: number | null = null;
  for (let i = 0; i < flows.length; i++) {
    const raw = levels[i] ?? null;
    const level = raw !== null && Number.isFinite(raw) && raw > 0 ? raw : null; // a zero or missing close is no level, not a level to divide by
    if (level !== null && previous !== null) value *= level / previous;
    if (level === null && previous === null && flows[i] !== 0) return null;
    value += flows[i];
    if (level !== null) previous = level;
  }
  return previous === null ? null : value;
}
