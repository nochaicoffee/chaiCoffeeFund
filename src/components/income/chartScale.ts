/** A round top for a money axis, a little above the biggest value (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × a power of ten). */
export function niceTop(value: number): number {
  if (value <= 0) return 100000;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * power).find((m) => m >= value * 1.04) ?? 10 * power;
}
