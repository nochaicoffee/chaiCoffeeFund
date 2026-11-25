/**
 * Where Tab should go to keep focus inside a modal list of `length` focusable items: the index to
 * move to, or null to let the browser take its normal step. Forward from the last item wraps to the
 * first, backward from the first wraps to the last; `index` -1 (focus is outside the list) wraps too.
 */
export function trapTarget(index: number, length: number, backwards: boolean): number | null {
  if (length === 0) return null;
  if (backwards && index <= 0) return length - 1;
  if (!backwards && index === length - 1) return 0;
  return null;
}
