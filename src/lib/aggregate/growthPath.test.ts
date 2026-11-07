import { describe, expect, it } from "vitest";
import { growthPath } from "./growthPath";

describe("growthPath", () => {
  it("starts at today's worth and has a point for every month after", () => {
    const p = growthPath(1_000_000, 0.09, 0, 120);
    expect(p).toHaveLength(121);
    expect(p[0]).toBe(1_000_000);
  });

  it("with no return and an amount a month, just adds the amounts", () => {
    expect(growthPath(100_000, 0, 5_000, 12).at(-1)).toBe(100_000 + 5_000 * 12);
  });

  it("with nothing added, compounds a twelfth of the yearly rate a month", () => {
    expect(growthPath(1_000_000, 0.12, 0, 120).at(-1)).toBeCloseTo(1_000_000 * 1.01 ** 120, 4);
    expect(growthPath(1_000_000, 0.12, 0, 1)[1]).toBeCloseTo(1_010_000, 6);
  });

  it("adding a month's amount at the end of the month: the first month's amount earns nothing that month", () => {
    expect(growthPath(0, 0.12, 1_000, 1)[1]).toBe(1_000);
    expect(growthPath(0, 0.12, 1_000, 2)[2]).toBeCloseTo(1_000 * 1.01 + 1_000, 9);
  });

  it("grows every month when the return and the worth are positive, and more with more added", () => {
    const none = growthPath(500_000, 0.06, 0, 60);
    const some = growthPath(500_000, 0.06, 25_000, 60);
    none.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(none[i]));
    expect(some.at(-1)!).toBeGreaterThan(none.at(-1)!);
  });
});
