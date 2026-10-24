// A port of src/components/rings.ts (the ring texture), as in the Accounts generator.
export function ringRadii(cx, cy, box, { first, step, count = Infinity }) {
  const left = box.x, right = box.x + box.width, top = box.y, bottom = box.y + box.height;
  const near = Math.hypot(Math.max(left - cx, 0, cx - right), Math.max(top - cy, 0, cy - bottom));
  const far = Math.hypot(Math.max(cx - left, right - cx), Math.max(cy - top, bottom - cy));
  const firstShown = Math.max(0, Math.ceil((near - first) / step));
  const lastShown = Math.min(count - 1, Math.floor((far - first) / step), firstShown + 199);
  const r = [];
  for (let i = firstShown; i <= lastShown; i++) r.push(first + i * step);
  return r;
}
/** Circles centred (dx, dy) past the bottom-right corner, stretched over the element. */
export function rings(w, h, { dx = 10, dy = 20, first = 40, step = 26, stroke = "var(--rings-ink)", opacity = 0.1, sheen = "", count } = {}) {
  const cx = w + dx, cy = h + dy;
  const circles = ringRadii(cx, cy, { x: 0, y: 0, width: w, height: h }, { first, step, count }).map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}"></circle>`).join("");
  return `<span class="tex" aria-hidden="true">${sheen ? `<span class="sheen" style="background:${sheen}"></span>` : ""}<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><g fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1">${circles}</g></svg></span>`;
}
/** The same circles drawn inside an SVG, clipped to a box. */
export function ringCircles(x, y, w, h, { dx = 10, dy = 20, first = 30, step = 18, stroke = "var(--rings-light)", opacity = 0.16, count = 14 } = {}) {
  const cx = x + w + dx, cy = y + h + dy;
  return ringRadii(cx, cy, { x, y, width: w, height: h }, { first, step, count }).map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}"></circle>`).join("");
}
