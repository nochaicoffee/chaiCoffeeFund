import { ringRadii, type RingSpacing } from "./rings";

/** The rings' ripple: they swell outward from the bottom-right corner. Add the trigger yourself, such as `group-hover/tile:scale-[1.18]`. */
export const RIPPLE_BASE = "origin-bottom-right motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out";

/** A white sheen glowing from a corner of a dark block, for RingTexture's `sheen`. `at` is a CSS position such as "88% 0%". */
export const whiteSheen = (at: string, alpha = 0.2) => `radial-gradient(circle at ${at}, oklch(1 0 0 / ${alpha}), transparent 55%)`;

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
  ringsClassName = "",
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
  /** Classes for the circles' layer, such as a scale on hover so the rings ripple outward (#104). */
  ringsClassName?: string;
}) {
  const cx = width + dx;
  const cy = height + dy;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      {sheen && <span className="absolute inset-0" style={{ background: sheen }} />}
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`absolute inset-0 size-full ${ringsClassName}`}>
        <RingCircles cx={cx} cy={cy} radii={ringRadii(cx, cy, { x: 0, y: 0, width, height }, spacing)} stroke={stroke} opacity={opacity} />
      </svg>
    </span>
  );
}
