/**
 * Where a count from `from` to `to` is after `elapsed` of `duration` ms: fast
 * at first, then settling (a cubic ease-out). Exactly `to` once the time is up.
 */
export function countAt(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to;
  const progress = Math.max(0, elapsed) / duration;
  return from + (to - from) * (1 - (1 - progress) ** 3);
}
