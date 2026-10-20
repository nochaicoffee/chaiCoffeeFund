import { describe, expect, it } from "vitest";
import { ringRadii } from "./rings";

const box = (width: number, height: number, x = 0, y = 0) => ({ x, y, width, height });

describe("ringRadii", () => {
  it("draws the heatmap cell's circles from the first that reaches the cell to the last before its far corner", () => {
    // Centred at (w+10, h+12). The nearest corner is √(10²+12²) ≈ 15.6 away, the farthest √(107.2²+64²) ≈ 124.8.
    const radii = ringRadii(107.2, 64, box(97.2, 52), { first: 10, step: 11 });
    expect(radii[0]).toBe(21);
    expect(radii.at(-1)).toBe(120);
    expect(radii).toHaveLength(10);
  });

  it("stops at the far corner when the design draws more circles than can be seen", () => {
    // The design draws 26 circles (26 to 676) on the details card's header; 650 is the last inside √(616²+244²) ≈ 662.6.
    const radii = ringRadii(616, 244, box(596, 200), { first: 26, step: 26 });
    expect(radii[0]).toBe(52);
    expect(radii.at(-1)).toBe(650);
    expect(radii).toHaveLength(24);
  });

  it("measures from the box's nearest edge when the centre is level with it", () => {
    // The Spend range bar's centre (400, 60) is above the bar's bottom edge, 36 below it.
    const radii = ringRadii(400, 60, box(420, 24), { first: 9, step: 9 });
    expect(radii[0]).toBe(36);
    expect(radii.at(-1)).toBe(396);
    expect(radii).toHaveLength(41);
  });

  it("stops after count circles even before the far corner", () => {
    // The All Cards tile's design draws 10 circles, 45 to 279, though its far corner is ≈ 377 away.
    const radii = ringRadii(310, 215, box(300, 196), { first: 45, step: 26, count: 10 });
    expect(radii).toEqual([45, 71, 97, 123, 149, 175, 201, 227, 253, 279]);
  });

  it("draws the same circles across a bar's stacked segments as across the whole bar", () => {
    // A 56-wide bar from y=100 to its base at y=250, with the circles centred at (w+12, base+14).
    const spacing = { first: 12, step: 12 };
    const whole = ringRadii(68, 264, box(56, 150, 0, 100), spacing);
    const upper = ringRadii(68, 264, box(56, 50, 0, 100), spacing);
    const lower = ringRadii(68, 264, box(56, 100, 0, 150), spacing);
    expect(upper[0]).toBe(120);
    expect([...new Set([...lower, ...upper])].sort((a, b) => a - b)).toEqual(whole);
  });

  it("never draws more circles than fit across the box", () => {
    const radii = ringRadii(88, 264.2, box(76, 250.2), { first: 12, step: 12 });
    expect(radii.length).toBeLessThanOrEqual(Math.hypot(76, 250.2) / 12 + 1);
    for (const r of radii) expect(r).toBeLessThanOrEqual(Math.hypot(88, 264.2));
  });

  it("caps the count however small the step", () => {
    expect(ringRadii(616, 244, box(596, 200), { first: 26, step: 0.01 })).toHaveLength(200);
  });

  it("draws nothing for an empty box or a step that isn't positive", () => {
    expect(ringRadii(10, 10, box(0, 26), { first: 8, step: 8 })).toEqual([]);
    expect(ringRadii(10, 10, box(50, 26), { first: 8, step: 0 })).toEqual([]);
  });
});
