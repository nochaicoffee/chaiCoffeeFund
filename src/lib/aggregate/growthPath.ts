/**
 * Where it could go in ten years (docs/design/investments.md, Understand it): today's worth grown at a yearly return he picks, with nothing
 * added or a fixed amount a month. Compounded monthly (a twelfth of the yearly rate each month), the month's amount added at its end, no
 * tax and no fees. The return is an assumption he chooses, not a forecast. Pure.
 */

/** The worth at the start (index 0) and at the end of each of `months` months. */
export function growthPath(startInr: number, yearlyRate: number, monthlyAddInr: number, months: number): number[] {
  const path = [startInr];
  let value = startInr;
  for (let m = 1; m <= months; m++) {
    value = value * (1 + yearlyRate / 12) + monthlyAddInr;
    path.push(value);
  }
  return path;
}
