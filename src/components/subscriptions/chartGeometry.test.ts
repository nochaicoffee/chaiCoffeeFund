import { describe, expect, it } from "vitest";
import { CARD_WIDTH, cardLeft } from "./chartGeometry";

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
