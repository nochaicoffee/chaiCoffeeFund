import { describe, expect, it } from "vitest";
import { LINE_EVERY_MS, LINES, lineWindows, OFFER_GAME_MS, RETRY_MS, SHOW_AFTER_MS, SLOW_DETAIL, SLOW_HEADLINE, SLOW_MS } from "./phase";

describe("the wait screen's timeline", () => {
  const windows = lineWindows();

  it("is ordered: the cup, then the game, then 'still on it', then Try again", () => {
    expect(SHOW_AFTER_MS).toBeLessThan(OFFER_GAME_MS);
    expect(OFFER_GAME_MS).toBeLessThan(SLOW_MS);
    expect(SLOW_MS).toBeLessThan(RETRY_MS);
  });

  it("starts on 'Counting the coins…' when the cup appears", () => {
    expect(windows[0].text).toBe("Counting the coins…");
    expect(windows[0].startMs).toBe(SHOW_AFTER_MS);
  });

  it("changes line every 2.4 s with no gap and no overlap, and says only its own lines", () => {
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].startMs).toBe(windows[i - 1].endMs);
      expect(windows[i].startMs - windows[i - 1].startMs).toBe(LINE_EVERY_MS);
    }
    // No line is on screen for a blink: every one has at least a full turn.
    for (const w of windows) expect(w.endMs - w.startMs).toBeGreaterThanOrEqual(LINE_EVERY_MS);
    for (const w of windows) expect(LINES as readonly string[]).toContain(w.text);
    expect(new Set(windows.map((w) => w.text)).size).toBe(windows.length);
  });

  it("is cut off at 8 s, where 'Still on it.' takes over and is never replaced by a cheerful line", () => {
    expect(windows.at(-1)!.endMs).toBe(SLOW_MS);
    for (const w of windows) {
      expect(w.endMs).toBeLessThanOrEqual(SLOW_MS);
      expect(w.endMs).toBeGreaterThan(w.startMs);
    }
    expect(SLOW_HEADLINE).toBe("Still on it.");
    expect(SLOW_DETAIL).toContain("Google Sheets is slow");
  });

  it("never shows a percentage: nothing it says has a number in it", () => {
    for (const text of [...LINES, SLOW_HEADLINE, SLOW_DETAIL]) expect(text).not.toMatch(/\d|%/);
  });
});
