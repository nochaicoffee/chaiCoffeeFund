/**
 * The wait screen's timeline (docs/design/login.md), as plain data: what appears when. The
 * screen turns it into CSS animation delays rather than timers, because on a hard load (a reload,
 * a new tab, the first page after signing in) Next doesn't start running the page's script until
 * the whole HTML has streamed, which is exactly when the wait is over. CSS runs from the first
 * paint, so the lines, "still on it" and Try again work then too. Only the game button needs
 * script, and it waits for it.
 *
 * There is nothing true to count (a page is waiting on Google Sheets, which reports no progress),
 * so there is never a percentage or a fake bar: a looping picture and honest lines.
 */

/** Nothing is drawn for the first moments: most loads are quick, and a loader that flashes is worse than none. */
export const SHOW_AFTER_MS = 250;
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
export function lineWindows(): LineWindow[] {
  const windows: LineWindow[] = [];
  for (let start = SHOW_AFTER_MS, i = 1; start + LINE_EVERY_MS < SLOW_MS; start += LINE_EVERY_MS, i++) {
    windows.push({ text: LINES[i % LINES.length], startMs: start, endMs: start + LINE_EVERY_MS });
  }
  windows[windows.length - 1].endMs = SLOW_MS;
  return windows;
}

/** What it says once the wait is long. */
export const SLOW_HEADLINE = "Still on it.";
export const SLOW_DETAIL = "Google Sheets is slow today. Nothing is lost.";
