/**
 * Geometry for the design's ring texture: faint concentric circles centred
 * just past an element's corner and clipped to it (RingTexture.tsx).
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RingSpacing {
  /** The first circle's radius. */
  first: number;
  /** How much each circle's radius grows on the one before. */
  step: number;
  /** Stop after this many circles, even short of the far corner (the All Cards tile's design stops at 10). */
  count?: number;
}

// However small the step, never more circles than this.
const MAX_RINGS = 200;

/**
 * The radii of the circles centred at (cx, cy) that cross the box: from the
 * first that reaches it to the last that doesn't pass its farthest corner. A
 * circle wholly outside the box would be clipped away, so it isn't drawn. That
 * leaves at most the box's diagonal over the step, plus one, and never more
 * than MAX_RINGS.
 */
export function ringRadii(cx: number, cy: number, box: Box, { first, step, count = Infinity }: RingSpacing): number[] {
  if (!(step > 0) || !(box.width > 0) || !(box.height > 0)) return [];
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const bottom = box.y + box.height;
  const near = Math.hypot(Math.max(left - cx, 0, cx - right), Math.max(top - cy, 0, cy - bottom));
  const far = Math.hypot(Math.max(cx - left, right - cx), Math.max(cy - top, bottom - cy));
  const firstShown = Math.max(0, Math.ceil((near - first) / step));
  const lastShown = Math.min(count - 1, Math.floor((far - first) / step), firstShown + MAX_RINGS - 1);
  const radii: number[] = [];
  for (let i = firstShown; i <= lastShown; i++) radii.push(first + i * step);
  return radii;
}
