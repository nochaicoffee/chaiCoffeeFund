export interface TipPlacement {
  /** The box the card is placed against (its left edge and width), in viewport pixels. */
  baseLeft: number;
  baseWidth: number;
  /** Where the card's left edge sits on that box and how far it is pulled back by its own width, as fractions (0.5 and -0.5 centre it). */
  tl: number;
  tx: number;
  tipWidth: number;
  viewport: number;
  /** The gap the card keeps from each side of the screen. */
  margin?: number;
}

/** How many pixels to slide a hover card sideways so all of it stays on screen (negative is left). A card too wide for the screen is pinned to its left margin. */
export function tipShift({ baseLeft, baseWidth, tl, tx, tipWidth, viewport, margin = 8 }: TipPlacement): number {
  const left = baseLeft + baseWidth * tl + tipWidth * tx;
  const right = left + tipWidth;
  if (tipWidth > viewport - 2 * margin || left < margin) return margin - left;
  if (right > viewport - margin) return viewport - margin - right;
  return 0;
}
