import type { LineView } from "@/app/accounts/views";
import { formatInrCompact } from "@/lib/format/money";

const W = 1000;
const H = 190;
const PAD_Y = 22;

/**
 * The hero's one line (docs/design/accounts.md): the pick's balance across the period, a
 * balance carried forward until the next, glowing white whatever the pick's colour, with
 * the months under it. Drawn at a fixed size and stretched to the stage's width.
 */
export function AccountLine({ line }: { line: LineView }) {
  const { points, months } = line;
  if (points.length < 2) {
    return <div className="flex h-[190px] items-center justify-center text-sm font-semibold text-on-card-muted">No balances in this period yet.</div>;
  }
  const t0 = Date.parse(points[0].date);
  const t1 = Date.parse(points[points.length - 1].date);
  const lo = Math.min(...points.map((p) => p.total));
  const hi = Math.max(...points.map((p) => p.total));
  const x = (date: string) => (t1 === t0 ? 0 : ((Date.parse(date) - t0) / (t1 - t0)) * W);
  const y = (total: number) => (hi === lo ? H / 2 : PAD_Y + (1 - (total - lo) / (hi - lo)) * (H - PAD_Y * 2));
  // A balance is carried until the next one, so the line steps: flat, then straight up or down at the change.
  let d = `M ${x(points[0].date)} ${y(points[0].total)}`;
  for (const p of points.slice(1)) d += ` L ${x(p.date)} ${y(p.total)}`;
  const last = points[points.length - 1];
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[190px] w-full overflow-visible" role="img" aria-label={`Balance from ${formatInrCompact(points[0].total)} to ${formatInrCompact(last.total)}`}>
        <defs>
          <linearGradient id="accounts-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.22" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#accounts-line-fill)" />
        <path d={d} fill="none" stroke="white" strokeWidth="9" strokeOpacity="0.18" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="relative mt-1 h-4 text-[11px] font-bold text-on-card-muted" aria-hidden="true">
        {months.map((m) => (
          <span key={m.date} className="absolute -translate-x-0" style={{ left: `${(x(m.date) / W) * 100}%` }}>
            {m.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
