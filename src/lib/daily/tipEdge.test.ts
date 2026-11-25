import { describe, expect, it } from "vitest";
import { tipShift } from "./tipEdge";

const base = { baseWidth: 150, tl: 0.5, tx: -0.5, tipWidth: 200, viewport: 411 };

describe("tipShift", () => {
  it("leaves a card that already fits where it is", () => {
    expect(tipShift({ ...base, baseLeft: 100 })).toBe(0);
  });

  it("slides a centred card back from the right edge", () => {
    // centred on a box at 230..380: the card spans 205..405, over the 403 limit by 2
    expect(tipShift({ ...base, baseLeft: 230 })).toBe(-2);
    // the right-hand Glance card on a phone, 214..395: centred is 204.5..404.5, so 1.5 left
    expect(tipShift({ ...base, baseLeft: 214, baseWidth: 181 })).toBeCloseTo(-1.5);
  });

  it("slides a centred card forward from the left edge", () => {
    // a box at 16..166 centred: the card spans -9..191, so it moves 17 right to start at the 8px margin
    expect(tipShift({ ...base, baseLeft: 16 })).toBe(17);
  });

  it("respects where the card is anchored, not only the centre", () => {
    // anchored to the box's right (the last bar of a row): the card ends at the box's right edge, 395
    expect(tipShift({ ...base, baseLeft: 245, tl: 1, tx: -1 })).toBe(0);
    // anchored to its left (the first bar): starts at the box's left edge, so a box at 300 runs off the right
    expect(tipShift({ ...base, baseLeft: 300, tl: 0, tx: 0 })).toBe(411 - 8 - 500);
  });

  it("pins a card wider than the screen to the left margin", () => {
    // centred on a box at 100..250, the 420px card would start at -35; pinned, it starts at the 8px margin
    expect(tipShift({ ...base, baseLeft: 100, tipWidth: 420 })).toBe(43);
  });
});
