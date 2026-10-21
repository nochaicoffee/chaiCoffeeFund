import { describe, expect, it } from "vitest";
import { CARD_WIDTH, besideLeft, cardLeft, dayAtPoint, nextDay, stepDay } from "./chartGeometry";

describe("cardLeft", () => {
  it("opens to the right of a bar when it fits, and to its left when it doesn't", () => {
    expect(cardLeft(100, 50, 1000, false)).toBe(158);
    // Jan '27 on a 1000px chart: to the right it would end at 1066px.
    expect(cardLeft(760, 50, 1000, false)).toBe(760 - 8 - CARD_WIDTH);
  });

  it("never goes past either edge", () => {
    for (const width of [320, 600, 1000, 1572]) {
      for (let x = 0; x < width; x += 37) {
        for (const phone of [true, false]) {
          const left = cardLeft(x, 30, width, phone);
          expect(left).toBeGreaterThanOrEqual(0);
          if (width >= CARD_WIDTH) expect(left + CARD_WIDTH).toBeLessThanOrEqual(width);
        }
      }
    }
  });

  it("centres it over the bar on a phone", () => {
    expect(cardLeft(150, 20, 360, true)).toBe(150 + 10 - CARD_WIDTH / 2);
  });
});

// 2026 as Day by day draws it: from Monday, Dec 29, 2025, 53 weeks.
const YEAR = { start: "2025-12-29", first: "2026-01-01", last: "2026-12-31", weeks: 53 };

describe("dayAtPoint", () => {
  it("finds the day under a point, a column a week and Monday at the top", () => {
    // 24px cells with a 4px gap: a 28px step.
    expect(dayAtPoint(5, 5 + 3 * 28, 28, YEAR)).toBe("2026-01-01");
    expect(dayAtPoint(28 + 1, 1, 28, YEAR)).toBe("2026-01-05");
    // The gap after a cell belongs to it.
    expect(dayAtPoint(27, 27 + 28 * 4, 28, YEAR)).toBe("2026-01-02");
  });

  it("keeps to the days drawn, however far the pointer goes", () => {
    expect(dayAtPoint(-50, -50, 28, YEAR)).toBe("2026-01-01");
    expect(dayAtPoint(5, 5, 28, YEAR)).toBe("2026-01-01");
    expect(dayAtPoint(10_000, 10_000, 28, YEAR)).toBe("2026-12-31");
  });
});

describe("stepDay", () => {
  it("moves up and down a day, left and right a week", () => {
    expect(stepDay("2026-10-20", "ArrowDown", YEAR)).toBe("2026-10-21");
    expect(stepDay("2026-10-20", "ArrowUp", YEAR)).toBe("2026-10-19");
    expect(stepDay("2026-10-20", "ArrowRight", YEAR)).toBe("2026-10-27");
    expect(stepDay("2026-10-20", "ArrowLeft", YEAR)).toBe("2026-10-13");
    expect(stepDay("2026-10-20", "Enter", YEAR)).toBeNull();
  });

  it("stops at the first and last days drawn", () => {
    expect(stepDay("2026-01-03", "ArrowLeft", YEAR)).toBe("2026-01-01");
    expect(stepDay("2026-12-30", "ArrowRight", YEAR)).toBe("2026-12-31");
  });

  it("knows the day after", () => {
    expect(nextDay("2026-02-28")).toBe("2026-03-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });
});

describe("besideLeft", () => {
  it("puts a month's card to the right of its weeks when it fits, else to their left", () => {
    expect(besideLeft(100, 120, 256, 1300)).toBe(232);
    expect(besideLeft(1100, 120, 256, 1300)).toBe(1100 - 12 - 256);
  });

  it("never goes past either edge", () => {
    expect(besideLeft(100, 200, 256, 400)).toBe(0);
    expect(besideLeft(0, 50, 256, 200)).toBe(0);
  });
});
