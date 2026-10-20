import { ringRadii, type RingSpacing } from "./rings";

/** The design's ring circles alone, for drawing inside an SVG of your own, such as a chart's bars. */
export function RingCircles({ cx, cy, radii, stroke, opacity = 1 }: { cx: number; cy: number; radii: number[]; stroke: string; opacity?: number }) {
  return (
    <g fill="none" stroke={stroke} strokeOpacity={opacity} strokeWidth="1" aria-hidden="true">
      {radii.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  );
}

/**
 * The design's texture behind an element's content: faint concentric circles
 * centred (dx, dy) past its bottom-right corner, with an optional sheen under
 * them. Like the design, they're drawn at the element's size in the design
 * (width × height) and stretched to fit it, and clipped to its rounded
 * corners. The element needs `relative isolate`.
 */
export function RingTexture({
  width,
  height,
  dx,
  dy,
  stroke,
  opacity,
  sheen,
  ...spacing
}: RingSpacing & {
  width: number;
  height: number;
  dx: number;
  dy: number;
  /** A colour token, such as var(--rings-ink). */
  stroke: string;
  opacity?: number;
  /** A CSS background, such as a radial-gradient, drawn under the circles. */
  sheen?: string;
}) {
  const cx = width + dx;
  const cy = height + dy;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      {sheen && <span className="absolute inset-0" style={{ background: sheen }} />}
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        <RingCircles cx={cx} cy={cy} radii={ringRadii(cx, cy, { x: 0, y: 0, width, height }, spacing)} stroke={stroke} opacity={opacity} />
      </svg>
    </span>
  );
}
