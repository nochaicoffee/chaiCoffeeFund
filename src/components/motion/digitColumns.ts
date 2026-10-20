/** One character of a RollingNumber (#117): a digit rolls; anything else (₹, commas, %, a point) stays put. */
export interface DigitColumn {
  /** Its place counted from the right, so a digit keeps its column when the number grows or shrinks. */
  place: number;
  char: string;
  digit: number | null;
}

/**
 * The columns of a formatted number, left to right. Places count from the
 * right because Indian grouping is fixed from the right ("₹1,23,105" and
 * "₹78,900" put their commas at the same places), so each column carries on
 * from its old digit when the value changes.
 */
export function digitColumns(text: string): DigitColumn[] {
  const chars = [...text];
  return chars.map((char, i) => ({ place: chars.length - 1 - i, char, digit: /^\d$/.test(char) ? Number(char) : null }));
}
