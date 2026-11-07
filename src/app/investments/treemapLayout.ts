import { squarify, type TreemapRect } from "@/lib/layout/treemap";
import type { SplitDimensionView } from "./splitView";

/**
 * "How it's split" as a treemap (docs/design/investments.md, picked 2026-11-04): each holding a block whose area is its worth. Cut by asset
 * class, market or company or fund, the blocks sit inside their slice's tile; cut by holding they are one flat map. A holding keeps the one
 * block (and so glides) whichever way it is cut. Worked out in the map's own pixels; pure.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GroupTile extends Box {
  key: string;
  label: string;
  colour: string;
  /** The tile's total, in words, shown at its top. */
  value: string;
  /** The height of the band at the top that names it; 0 when the tile is too small to name. */
  header: number;
}

export interface TreemapLayout {
  groups: GroupTile[];
  /** Each holding's block, by its key. */
  blocks: Map<string, Box>;
}

/** The gap left between neighbours, and the band that names a group. */
const GAP = 3;
const HEADER = 30;
/** A group tile has to be this tall for its name to fit above its blocks. */
const NAMEABLE = 76;

const inset = (r: Box, by: number): Box => {
  const w = Math.max(1, r.w - by * 2);
  const h = Math.max(1, r.h - by * 2);
  return { x: r.x + by, y: r.y + by, w, h };
};
const place = (rects: TreemapRect[], within: Box, gap: number): Map<string, Box> =>
  new Map(rects.map((r) => [r.key, inset({ x: within.x + r.x, y: within.y + r.y, w: r.w, h: r.h }, gap / 2)]));

/**
 * `skip` is a holding folded away ("try without"): its block isn't laid out and the others grow. Only meaningful for the flat map, where the
 * layout has no groups to shrink.
 */
export function layoutTreemap(dimension: SplitDimensionView, width: number, height: number, skip?: string): TreemapLayout {
  const weightOf = (sliceFraction: number, memberFraction: number) => sliceFraction * memberFraction;
  const flat = dimension.key === "holding";

  if (flat) {
    const items = dimension.slices.flatMap((s) => s.members.filter((m) => m.key !== skip).map((m) => ({ key: m.key, value: weightOf(s.fraction, m.fraction) })));
    return { groups: [], blocks: place(squarify(items, width, height), { x: 0, y: 0, w: width, h: height }, GAP) };
  }

  const tiles = place(squarify(dimension.slices.map((s) => ({ key: s.key, value: s.fraction })), width, height), { x: 0, y: 0, w: width, h: height }, GAP);
  const groups: GroupTile[] = [];
  const blocks = new Map<string, Box>();
  for (const slice of dimension.slices) {
    const tile = tiles.get(slice.key);
    if (!tile) continue;
    const header = tile.h >= NAMEABLE && tile.w >= 70 ? HEADER : 0;
    groups.push({ ...tile, key: slice.key, label: slice.label, colour: slice.colour, value: slice.value, header });
    // The padding inside a tile shrinks with a thin one, so its blocks always sit inside it.
    const pad = Math.min(GAP, tile.w / 4, tile.h / 4);
    const room: Box = { x: tile.x + pad, y: tile.y + header + (header ? 0 : pad), w: tile.w - pad * 2, h: tile.h - header - (header ? pad : pad * 2) };
    const inner = place(squarify(slice.members.map((m) => ({ key: m.key, value: m.fraction })), room.w, room.h), room, Math.min(GAP, room.w / 2, room.h / 2));
    for (const [key, box] of inner) blocks.set(key, box);
  }
  return { groups, blocks };
}

/** What would be left of everything without one holding, in rupees, and what it would then have gained over what it cost (negative for a loss). */
export function withoutHolding(members: { key: string; valueInr: number; costInr: number }[], key: string): { leftInr: number; gainInr: number } | null {
  const gone = members.find((m) => m.key === key);
  if (!gone) return null;
  const rest = members.filter((m) => m.key !== key);
  const leftInr = rest.reduce((s, m) => s + m.valueInr, 0);
  return { leftInr, gainInr: leftInr - rest.reduce((s, m) => s + m.costInr, 0) };
}
