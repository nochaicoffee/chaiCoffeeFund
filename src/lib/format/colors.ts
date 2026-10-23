import { COLORS, type Color } from "../sheets/types";

/** A colour as its CSS token's key (`--card-<key>-from`): COLORS, lowercased. */
export type ColorKey = Lowercase<Color>;

/** The 155° gradient (or another angle) a tile, cover or card in this colour is drawn with. */
export function colorGradient(color: ColorKey, angle = 155): string {
  return `linear-gradient(${angle}deg, var(--card-${color}-from), var(--card-${color}-to))`;
}

/** The solid swatch for chart marks and legend dots. */
export function colorSwatch(color: ColorKey): string {
  return `var(--card-${color})`;
}

/** A colour as its token key; Onyx when it has none. */
export function cardColorKey(color: Color | undefined): ColorKey {
  return (color ?? "Onyx").toLowerCase() as ColorKey;
}

/** The colour as the Sheet's dropdown names it: "Ruby". */
export function colorName(key: ColorKey): Color {
  return (key[0].toUpperCase() + key.slice(1)) as Color;
}

/**
 * The order a new card, account or subscription is offered colours in: the standard hues first,
 * spread around the wheel (not the pickers' neighbour-by-neighbour order), then the dusk twins.
 */
const START_ORDER: Color[] = ["Sapphire", "Ruby", "Onyx", "Violet", "Teal", "Copper", "Pink", "Olive", "Amber", "Plum", "Ocean", "Emerald", "Coral", "Slate", "Mocha", "Cobalt", "Burgundy", "Spruce", "Aubergine", "Rust", "Moss", "Raspberry", "Navy", "Bronze", "Mulberry", "Pine"];

/** The colour a new one starts on: the first none of `used` has, skipping `except` (Emerald for a card or an account, as it's All's). Sapphire when all are taken. */
export function freeColor(used: readonly Color[], except: readonly Color[] = []): Color {
  const order = [...START_ORDER, ...COLORS.filter((c) => !START_ORDER.includes(c))];
  return order.find((c) => !except.includes(c) && !used.includes(c)) ?? "Sapphire";
}

/**
 * The colours grouped by family, for the pickers: choose a family, then a shade in it (Prathik,
 * 2026-10-23). Each colour is in exactly one (colors.test.ts), and the first in a family is the
 * one its pill is drawn in when nothing in it is picked.
 */
export const COLOR_FAMILIES: { name: string; colors: Color[] }[] = [
  { name: "Red", colors: ["Ruby", "Burgundy"] },
  { name: "Orange", colors: ["Coral", "Copper", "Rust"] },
  { name: "Gold", colors: ["Amber", "Bronze", "Honey"] },
  { name: "Lime", colors: ["Olive", "Moss"] },
  { name: "Green", colors: ["Forest", "Emerald", "Pine", "Jade"] },
  { name: "Teal", colors: ["Teal", "Spruce", "Sky"] },
  { name: "Blue", colors: ["Ocean", "Navy", "Azure", "Sapphire", "Cobalt"] },
  { name: "Violet", colors: ["Indigo", "Violet", "Aubergine"] },
  { name: "Purple", colors: ["Orchid", "Plum", "Mulberry"] },
  { name: "Pink", colors: ["Magenta", "Pink", "Raspberry", "Rose"] },
  { name: "Grey", colors: ["Onyx", "Slate", "Mocha", "Graphite"] },
];

/** The families as a picker offers them: only the colours it's given, and none left empty. */
export function familiesOf(offered: readonly Color[]): { name: string; colors: Color[] }[] {
  return COLOR_FAMILIES.map((f) => ({ name: f.name, colors: f.colors.filter((c) => offered.includes(c)) })).filter((f) => f.colors.length > 0);
}
