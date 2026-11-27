/**
 * The class for a bold part of a sub-page's summary sentence. A figure ("₹1,23,456", "51 this year") never breaks across
 * lines; a longer part, such as a list of names, may wrap, or on a phone it runs past the screen's edge (found 2026-11-27 on
 * Balance history).
 */
export const FIGURE_MAX_UNBROKEN = 24;

export function figureClass(text: string): string {
  return `font-bold ${text.length > FIGURE_MAX_UNBROKEN ? "" : "whitespace-nowrap "}text-fg tabular-nums`;
}
