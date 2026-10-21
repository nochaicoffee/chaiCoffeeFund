import { shareOfTotal, type ColorKey } from "@/lib/format/subscriptionLabels";
import { squarify } from "./treemap";

/**
 * The cost map's layout and what-ifs (Prathik's picks 1A, 1B and 7C): where each block
 * sits, Each or By category, with the ones being tried without left out and room made for
 * a ghost. By category lays each subscription out inside its category's tile, so the same
 * blocks move between the two views rather than being swapped for others. Pure, so it's
 * tested; boxes come back in the map's own pixels, already inset by the gaps.
 */

export interface MapEntry {
  id: string;
  alias: string;
  color: ColorKey;
  monthly: number;
  category: string;
  categoryLabel: string;
  categoryColor: ColorKey;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapCategory<T extends MapEntry = MapEntry> {
  key: string;
  label: string;
  color: ColorKey;
  monthly: number;
  /** Its subscriptions, biggest first. */
  members: T[];
}

export interface MapLayout {
  /** Every entry's box. One tried without is folded to a point at the middle of where it was. */
  boxes: Map<string, Box>;
  /** By category: each category's tile. Empty for Each. */
  tiles: Map<string, Box>;
  /** The ghost's box, when there's one. */
  ghost: Box | null;
}

/** Between blocks, and between the blocks inside a category's tile. */
export const GAP = 6;
const INNER = 2;

const inset = (r: Box, by: number): Box => ({ x: r.x + by / 2, y: r.y + by / 2, w: Math.max(0, r.w - by), h: Math.max(0, r.h - by) });
const byMonthly = <T extends { monthly: number }>(a: T, b: T) => b.monthly - a.monthly;

/** The entries' categories, biggest first, each with its subscriptions biggest first. */
export function mapCategories<T extends MapEntry>(entries: T[]): MapCategory<T>[] {
  const groups = new Map<string, MapCategory<T>>();
  for (const e of entries) {
    const group = groups.get(e.category) ?? { key: e.category, label: e.categoryLabel, color: e.categoryColor, monthly: 0, members: [] };
    group.monthly += e.monthly;
    group.members.push(e);
    groups.set(e.category, group);
  }
  return [...groups.values()].map((g) => ({ ...g, members: [...g.members].sort(byMonthly) })).sort(byMonthly);
}

/** What a category's hover card says: "2 subscriptions", "49% of your ₹1,865 a month". */
export function categoryCard(category: MapCategory, total: number): { count: string; share: string } {
  const n = category.members.length;
  return { count: `${n} ${n === 1 ? "subscription" : "subscriptions"}`, share: shareOfTotal(category.monthly, total) };
}

const GHOST = "\u0000ghost";

function place(entries: MapEntry[], by: "each" | "category", ghost: number | null, width: number, height: number) {
  const boxes = new Map<string, Box>();
  const tiles = new Map<string, Box>();
  let ghostBox: Box | null = null;
  const extra = ghost !== null && ghost > 0 ? [{ key: GHOST, value: ghost }] : [];
  if (by === "each") {
    for (const r of squarify([...entries.map((e) => ({ key: e.id, value: e.monthly })), ...extra], width, height)) {
      if (r.key === GHOST) ghostBox = inset(r, GAP);
      else boxes.set(r.key, inset(r, GAP));
    }
  } else {
    const categories = mapCategories(entries);
    const byKey = new Map(categories.map((c) => [c.key, c]));
    // A ghost isn't part of any category's total, so it gets a tile of its own.
    for (const r of squarify([...categories.map((c) => ({ key: c.key, value: c.monthly })), ...extra], width, height)) {
      const tile = inset(r, GAP);
      if (r.key === GHOST) {
        ghostBox = tile;
        continue;
      }
      tiles.set(r.key, tile);
      for (const m of squarify(byKey.get(r.key)!.members.map((e) => ({ key: e.id, value: e.monthly })), tile.w, tile.h)) {
        boxes.set(m.key, inset({ x: tile.x + m.x, y: tile.y + m.y, w: m.w, h: m.h }, INNER));
      }
    }
  }
  return { boxes, tiles, ghost: ghostBox };
}

/**
 * The map's layout, Each or By category, at its size. The entries in `without` are left out
 * and the rest grow to fill; each one left out folds to the middle of where it would be, so
 * it can shrink away and grow back. `ghost` is a dashed block's monthly cost, for a paused
 * or cancelled subscription's chip.
 */
export function mapLayout(entries: MapEntry[], { by, without, ghost, width, height }: { by: "each" | "category"; without: ReadonlySet<string>; ghost: number | null; width: number; height: number }): MapLayout {
  const shown = entries.filter((e) => !without.has(e.id));
  const layout = place(shown, by, ghost, width, height);
  if (shown.length < entries.length) {
    const full = place(entries, by, null, width, height).boxes;
    for (const e of entries) {
      if (!without.has(e.id)) continue;
      const b = full.get(e.id);
      if (b) layout.boxes.set(e.id, { x: b.x + b.w / 2, y: b.y + b.h / 2, w: 0, h: 0 });
    }
  }
  return layout;
}

/**
 * The line over the map while some are tried without: their names, in the order they were
 * taken out, what's left to pay a month, and what that saves a year.
 */
export function whatIf(entries: MapEntry[], without: ReadonlySet<string>): { names: string; monthly: number; savedYearly: number } | null {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out = [...without].map((id) => byId.get(id)).filter((e): e is MapEntry => e !== undefined);
  if (out.length === 0) return null;
  const saved = out.reduce((t, e) => t + e.monthly, 0);
  const total = entries.reduce((t, e) => t + e.monthly, 0);
  const aliases = out.map((e) => e.alias);
  const names = aliases.length === 1 ? aliases[0] : `${aliases.slice(0, -1).join(", ")} and ${aliases.at(-1)}`;
  return { names, monthly: total - saved, savedYearly: saved * 12 };
}
