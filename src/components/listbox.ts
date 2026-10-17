/**
 * The pure parts of the app's dropdowns (Select.tsx): which option the keys
 * move to, type-ahead, and where a menu goes on screen. Kept apart from the
 * component so they can be tested without a browser.
 */

export interface ListboxItem {
  label: string;
  disabled?: boolean;
}

function enabledIndexes(items: readonly ListboxItem[]): number[] {
  return items.flatMap((item, i) => (item.disabled ? [] : [i]));
}

/**
 * The enabled option `step` places on from `from`, stopping at the first and
 * last rather than wrapping, as a native select does. A `from` of -1 (nothing
 * highlighted) counts as just before the first option, or just after the last
 * when stepping back. -1 when every option is disabled.
 */
export function stepIndex(items: readonly ListboxItem[], from: number, step: number): number {
  const enabled = enabledIndexes(items);
  if (enabled.length === 0) return -1;
  let at = enabled.indexOf(from);
  if (at === -1) at = step > 0 ? -1 : enabled.length;
  return enabled[Math.min(enabled.length - 1, Math.max(0, at + step))];
}

/** The first or last enabled option (Home and End), or -1 when there's none. */
export function edgeIndex(items: readonly ListboxItem[], edge: "first" | "last"): number {
  const enabled = enabledIndexes(items);
  if (enabled.length === 0) return -1;
  return edge === "first" ? enabled[0] : enabled[enabled.length - 1];
}

/**
 * Type-ahead: the next enabled option whose label starts with what's been typed,
 * ignoring case. One letter, or the same letter typed again, moves on to the
 * next match after `from`, so pressing "a" steps through every bank starting
 * with A. A longer search stays on the current option while it still matches,
 * so typing "ax" after "a" doesn't skip past Axis. -1 when nothing matches.
 */
export function typeaheadIndex(items: readonly ListboxItem[], from: number, typed: string): number {
  if (typed === "") return -1;
  const repeated = [...typed].every((c) => c === typed[0]);
  const term = (repeated ? typed[0] : typed).toLowerCase();
  const n = items.length;
  const start = repeated ? from + 1 : Math.max(0, from);
  for (let k = 0; k < n; k++) {
    const i = (((start + k) % n) + n) % n;
    if (!items[i].disabled && items[i].label.toLowerCase().startsWith(term)) return i;
  }
  return -1;
}

export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
}

export interface PopoverPlacement {
  top: number;
  left: number;
  /** Which side of the trigger it opens on. */
  side: "bottom" | "top";
  /** The most the menu can be tall there, so it never runs off the window. */
  maxHeight: number;
}

/** The gap between a trigger and its menu, and the margin a menu keeps from the window's edges. */
export const POPOVER_GAP = 8;
export const POPOVER_MARGIN = 16;

/**
 * Where a menu or panel opens: under its trigger, left edges lined up, unless it
 * would run off the right of the window. Then it lines up with the trigger's
 * right edge (`align: "end"`) or slides left just enough (`"start"`), never
 * closer than 16px to either side. It opens above instead only when it doesn't
 * fit below and there's more room above.
 */
export function popoverPlacement(
  trigger: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  align: "start" | "end" = "start",
): PopoverPlacement {
  const roomBelow = viewport.height - trigger.bottom - POPOVER_GAP - POPOVER_MARGIN;
  const roomAbove = trigger.top - POPOVER_GAP - POPOVER_MARGIN;
  const side = size.height > roomBelow && roomAbove > roomBelow ? "top" : "bottom";
  const maxHeight = Math.max(0, side === "bottom" ? roomBelow : roomAbove);
  const height = Math.min(size.height, maxHeight);
  const top = side === "bottom" ? trigger.bottom + POPOVER_GAP : trigger.top - POPOVER_GAP - height;

  const rightmost = viewport.width - POPOVER_MARGIN - size.width;
  let left = trigger.left;
  if (left > rightmost) left = align === "end" ? trigger.right - size.width : rightmost;
  left = Math.max(POPOVER_MARGIN, Math.min(left, rightmost));
  return { top, left, side, maxHeight };
}
