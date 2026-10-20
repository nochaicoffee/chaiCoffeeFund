import { describe, expect, it } from "vitest";
import { countAt } from "./countAt";

describe("countAt", () => {
  it("starts where it was and ends exactly on the new value", () => {
    expect(countAt(69850, 44457.42, 0, 650)).toBe(69850);
    expect(countAt(69850, 44457.42, 650, 650)).toBe(44457.42);
    expect(countAt(69850, 44457.42, 9999, 650)).toBe(44457.42);
  });

  it("moves one way only, faster at first than at the end", () => {
    const steps = [0, 100, 200, 300, 400, 500, 600].map((t) => countAt(0, 1000, t, 650));
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    expect(steps[1] - steps[0]).toBeGreaterThan(steps[6] - steps[5]);
    // Past halfway in value by half time, so a jump to another card reads as decisive.
    expect(countAt(0, 1000, 325, 650)).toBeGreaterThan(500);
  });

  it("counts down as well as up, and lands at once with no time to count", () => {
    expect(countAt(1000, 0, 325, 650)).toBeLessThan(500);
    expect(countAt(1000, 0, 0, 0)).toBe(0);
  });

  it("treats a frame stamped before the count began as its start", () => {
    expect(countAt(10, 20, -5, 650)).toBe(10);
  });
});
