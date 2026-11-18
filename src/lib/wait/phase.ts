/**
 * The wait screen's timeline (docs/design/login.md), as plain data: what appears when, after the skeleton. The
 * screen turns it into CSS animation delays rather than timers, because on a hard load (a reload,
 * a new tab, the first page after signing in) Next doesn't start running the page's script until
 * the whole HTML has streamed, which is exactly when the wait is over. CSS runs from the first
 * paint, so the lines, "still on it" and Try again work then too. Only the game button needs
 * script, and it waits for it.
 *
 * There is nothing true to count (a page is waiting on Google Sheets, which reports no progress),
 * so there is never a percentage or a fake bar: a looping picture and honest lines.
 */

/**
 * The page-shaped skeleton (components/wait/PageSkeleton.tsx) is on screen from the first moment; the
 * Kulhad takes over from it at this point. A cold read takes one to three seconds, so a cup that
 * appeared at once would flash up on every click: the skeleton covers the usual wait and the cup is
 * for the long one. (The first design had the cup at 250 ms, before the skeleton existed; this is the
 * one number to change to go back.)
 */
export const SHOW_AFTER_MS = 1500;
/** From here a quiet "Play while you wait" is offered, once the script is running. It never starts by itself. */
export const OFFER_GAME_MS = 3000;
/** The lines stop and it says the wait is long. */
export const SLOW_MS = 8000;
/** A Try again appears. */
export const RETRY_MS = 20000;
/** How long each line stays. */
export const LINE_EVERY_MS = 2400;

export const LINES = ["Heating the pan…", "Counting the coins…", "Steeping your numbers…", "Stirring in the sugar…", "Almost poured…"] as const;

/** One line of the cycle: shown from `startMs` to `endMs` after the wait began. */
export interface LineWindow {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * The lines before the wait is called long: it starts on "Counting the coins…" (the first line,
 * "Heating the pan…", comes round after the others), each stays LINE_EVERY_MS, and the last one
 * stays on until SLOW_MS, where "Still on it." takes over for good. A line is only started if it
 * can have a full turn, so none is on screen for a blink.
 */
export function lineWindows(showAfterMs = SHOW_AFTER_MS, slowMs = SLOW_MS): LineWindow[] {
  const windows: LineWindow[] = [];
  for (let start = showAfterMs, i = 1; start + LINE_EVERY_MS < slowMs; start += LINE_EVERY_MS, i++) {
    windows.push({ text: LINES[i % LINES.length], startMs: start, endMs: start + LINE_EVERY_MS });
  }
  if (windows.length === 0) {
    // The cup comes so late that no line fits a full turn: one line for whatever time is left, or none if there is none.
    return showAfterMs < slowMs ? [{ text: LINES[1], startMs: showAfterMs, endMs: slowMs }] : [];
  }
  windows[windows.length - 1].endMs = slowMs;
  return windows;
}

/** What it says once the wait is long. */
export const SLOW_HEADLINE = "Still on it.";
export const SLOW_DETAIL = "Google Sheets is slow today. Nothing is lost.";
