/** The Payment trend's hover card: how wide it is, and where it goes. */
export const CARD_WIDTH = 248;

/**
 * Where a month's hover card goes, from its bar's left edge and width: beside the bar on
 * whichever side it fits (centred over it on a phone), and never past the chart's edges.
 */
export function cardLeft(x: number, barWidth: number, width: number, phone: boolean): number {
  let left = phone ? x + barWidth / 2 - CARD_WIDTH / 2 : x + barWidth + 8;
  if (!phone && left + CARD_WIDTH > width) left = x - 8 - CARD_WIDTH;
  return Math.min(Math.max(0, left), Math.max(0, width - CARD_WIDTH));
}
