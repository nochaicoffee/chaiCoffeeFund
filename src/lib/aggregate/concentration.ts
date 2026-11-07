/**
 * How concentrated (docs/design/investments.md, Understand it): how few holdings carry most of what he holds. Counts and one measure, no
 * limit and no suggestion. The shares are each holding's part of the whole; they are scaled to add to 1, so a rounding gap doesn't matter. Pure.
 */

export interface Concentration {
  /** How many of the biggest holdings it takes to reach half, and to reach 80%, of what he holds. */
  forHalf: number;
  forEighty: number;
  /**
   * "Like holding N equal ones": 1 divided by the sum of each share squared. With every holding the same size it is how many there are;
   * the more one holding dominates, the nearer it falls to 1.
   */
  likeHolding: number;
}

const EPS = 1e-9;

/** How many of the biggest it takes for their shares to reach `fraction` of the whole. */
function holdingsToReach(sortedShares: number[], fraction: number): number {
  let sum = 0;
  for (let i = 0; i < sortedShares.length; i++) {
    sum += sortedShares[i];
    if (sum >= fraction - EPS) return i + 1;
  }
  return sortedShares.length;
}

/** Null with nothing held (every share nothing). */
export function concentration(shares: number[]): Concentration | null {
  const total = shares.reduce((s, x) => s + x, 0);
  // `!(total > 0)` also catches NaN (every holding worth nothing, so each share is 0 over 0).
  if (shares.length === 0 || !(total > 0)) return null;
  const sorted = shares.map((s) => s / total).sort((a, b) => b - a);
  return {
    forHalf: holdingsToReach(sorted, 0.5),
    forEighty: holdingsToReach(sorted, 0.8),
    likeHolding: 1 / sorted.reduce((s, x) => s + x * x, 0),
  };
}
