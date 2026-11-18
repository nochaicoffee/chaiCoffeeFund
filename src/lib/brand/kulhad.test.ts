import { describe, expect, it } from "vitest";
import { KULHAD_CSS, kulhadSvg } from "./kulhad";

describe("the Kulhad", () => {
  const svg = kulhadSvg();

  it("lets its coins start above the picture and fall in front of nothing that clips them", () => {
    expect(KULHAD_CSS).toContain("overflow: visible");
    // The coin appears faint and small, well above the cup, before it moves.
    expect(KULHAD_CSS).toMatch(/0% \{ transform: translate\(var\(--x\), -30px\) scale\(\.4\); opacity: 0;/);
  });

  it("ends each coin lower than the cup's front lip, so the cup hides it before it vanishes", () => {
    const end = Number(/--end: (\d+)px/.exec(KULHAD_CSS)?.[1]);
    const lipAtCentre = 50 + 8; // the opening's centre line plus its half-height
    const coinRadius = 9;
    expect(end - coinRadius).toBeGreaterThan(lipAtCentre);
    // It only goes invisible after it has arrived (50.1%), never while it is still in view.
    expect(KULHAD_CSS).toMatch(/50% \{[^}]*opacity: 1;/);
    expect(KULHAD_CSS).toMatch(/50\.1%, 100% \{[^}]*opacity: 0;/);
  });

  it("has three coins inside the opening, each with a ripple", () => {
    expect(svg.match(/class="kh-coin"/g)).toHaveLength(3);
    expect(svg.match(/class="kh-ripple"/g)).toHaveLength(3);
    for (const x of [...svg.matchAll(/--x:(\d+)px/g)].map((m) => Number(m[1]))) {
      expect(x - 9).toBeGreaterThan(38);
      expect(x + 9).toBeLessThan(118);
    }
  });

  it("is decorative, and stands alone with its own gradients", () => {
    expect(svg).toContain('aria-hidden="true"');
    for (const id of ["kh-coinG", "kh-clay", "kh-chai", "kh-blur"]) expect(svg).toContain(`id="${id}"`);
    expect(svg).not.toContain("<script");
  });

  it("stops moving for someone who asked for less motion", () => {
    expect(KULHAD_CSS).toMatch(/prefers-reduced-motion: reduce\) \{ \.kh, \.kh \* \{ animation: none !important/);
  });
});
