import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARD_COLORS, COLORS, SUBSCRIPTION_COLORS } from "../sheets/types";
import { COLOR_FAMILIES, cardColorKey, colorGradient, colorName, familiesOf, freeColor } from "./colors";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

describe("the card palette", () => {
  it("has no repeated colour", () => {
    expect(new Set(COLORS).size).toBe(COLORS.length);
  });

  it("gives every colour its gradient and swatch tokens in globals.css", () => {
    for (const name of COLORS) {
      const key = name.toLowerCase();
      for (const token of [`--card-${key}-from:`, `--card-${key}-to:`, `--card-${key}:`]) {
        expect(css, `${name} is missing ${token}`).toContain(token);
      }
    }
  });

  it("gives every colour its own flat shade under Neubrutalism (ADR 0018), so no two cards picked apart look alike", () => {
    const start = css.indexOf(':root[data-look="neubrutal"] {');
    const block = css.slice(start, css.indexOf("\n}", start));
    const shades = COLORS.map((name) => {
      const key = name.toLowerCase();
      const from = block.match(new RegExp(`--card-${key}-from: ([^;]+);`))?.[1];
      const to = block.match(new RegExp(`--card-${key}-to: ([^;]+);`))?.[1];
      expect(from, `${name} has no Neubrutalism shade`).toBeDefined();
      expect(to, `${name}'s Neubrutalism shade isn't flat`).toBe(from);
      return from;
    });
    expect(new Set(shades).size).toBe(COLORS.length);
  });

  it("offers cards and accounts everything but Emerald, which is All Cards', and subscriptions all of it", () => {
    expect(CARD_COLORS).toHaveLength(COLORS.length - 1);
    expect(CARD_COLORS).not.toContain("Emerald");
    expect(SUBSCRIPTION_COLORS).toEqual(COLORS);
  });

  it("round-trips a colour through its token key", () => {
    for (const name of COLORS) expect(colorName(cardColorKey(name))).toBe(name);
    expect(cardColorKey(undefined)).toBe("onyx");
    expect(colorGradient("coral")).toBe("linear-gradient(155deg, var(--card-coral-from), var(--card-coral-to))");
  });
});

describe("freeColor", () => {
  it("starts on Sapphire, then walks the spread-out order, not the pickers' neighbour order", () => {
    expect(freeColor([])).toBe("Sapphire");
    expect(freeColor(["Sapphire", "Ruby"])).toBe("Onyx");
  });

  it("skips the colours it's told to, and never returns one in use while any is free", () => {
    expect(freeColor(["Sapphire", "Ruby", "Onyx", "Violet", "Teal", "Copper", "Pink", "Olive", "Amber", "Plum", "Ocean"], ["Emerald"])).toBe("Coral");
    const used = COLORS.filter((c) => c !== "Mocha");
    expect(freeColor(used)).toBe("Mocha");
  });

  it("falls back to Sapphire when every colour is taken", () => {
    expect(freeColor(COLORS)).toBe("Sapphire");
  });
});

describe("colour families", () => {
  it("puts every colour in exactly one family", () => {
    const all = COLOR_FAMILIES.flatMap((f) => f.colors);
    expect([...all].sort()).toEqual([...COLORS].sort());
  });

  it("offers only the colours a picker has, and drops a family left empty", () => {
    const families = familiesOf(CARD_COLORS);
    expect(families.flatMap((f) => f.colors)).not.toContain("Emerald");
    expect(families.find((f) => f.name === "Green")?.colors).toEqual(["Forest", "Pine", "Jade"]);
    expect(familiesOf(["Ruby", "Burgundy"]).map((f) => f.name)).toEqual(["Red"]);
  });
});
