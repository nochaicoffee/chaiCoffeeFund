/**
 * The cost map's layout: a squarified treemap (Bruls et al.), as in the design's
 * cost map. Each item gets a rectangle whose area is its share of the box, laid out
 * in rows that keep the rectangles as close to square as they can. Pure, so it's
 * tested; positions come back in the box's own units.
 */

export interface TreemapItem {
  key: string;
  value: number;
}

export interface TreemapRect extends TreemapItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function squarify(items: TreemapItem[], width: number, height: number): TreemapRect[] {
  const positive = items.filter((it) => it.value > 0);
  const total = positive.reduce((t, it) => t + it.value, 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];
  let rest = positive.map((it) => ({ ...it, area: (it.value / total) * width * height })).sort((a, b) => b.area - a.area);
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  const out: TreemapRect[] = [];
  // How far from square the worst rectangle in a row is, laid along a side this long.
  const worst = (row: { area: number }[], side: number) => {
    const sum = row.reduce((t, r) => t + r.area, 0);
    const max = Math.max(...row.map((r) => r.area));
    const min = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    const row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) row.push(rest[i++]);
    const sum = row.reduce((t, r) => t + r.area, 0);
    if (w >= h) {
      const rowWidth = sum / h;
      let yy = y;
      for (const r of row) {
        const rh = r.area / rowWidth;
        out.push({ key: r.key, value: r.value, x, y: yy, w: rowWidth, h: rh });
        yy += rh;
      }
      x += rowWidth;
      w -= rowWidth;
    } else {
      const rowHeight = sum / w;
      let xx = x;
      for (const r of row) {
        const rw = r.area / rowHeight;
        out.push({ key: r.key, value: r.value, x: xx, y, w: rw, h: rowHeight });
        xx += rw;
      }
      y += rowHeight;
      h -= rowHeight;
    }
    rest = rest.slice(i);
  }
  return out;
}
