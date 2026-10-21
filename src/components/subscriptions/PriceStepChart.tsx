"use client";

import { formatInr } from "@/lib/format/money";
import { useSize } from "./useSize";

/**
 * What each payment cost, as a step line from the first payment to today (the design's
 * priceStep), drawn at the card's own width so its labels stay readable: a year line at
 * each new year, each price change marked with how much it moved, and today's price.
 */
export function PriceStepChart({ points, changes, today, alias }: { points: { date: string; amount: number }[]; changes: { date: string; from: number; to: number }[]; today: string; alias: string }) {
  const [box, size] = useSize<HTMLDivElement>({ w: 640, h: 0 });
  if (points.length === 0) return <p className="py-8 text-center text-[13px] font-medium text-muted">Nothing has been charged yet.</p>;
  const W = Math.max(240, size.w);
  const H = 120;
  const pad = 26;
  const t = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const end = today > points.at(-1)!.date ? today : points.at(-1)!.date;
  const x0 = t(points[0].date);
  const x1 = Math.max(t(end), x0 + 1);
  const amounts = points.map((p) => p.amount);
  const lo = Math.min(...amounts) * 0.75;
  const hi = Math.max(...amounts) * 1.12 || 1;
  const X = (d: string) => pad + ((t(d) - x0) / (x1 - x0)) * (W - pad * 2);
  const Y = (v: number) => H - 22 - ((v - lo) / (hi - lo || 1)) * (H - 44);
  let line = `M${X(points[0].date).toFixed(1)},${Y(points[0].amount).toFixed(1)}`;
  for (const p of points.slice(1)) line += ` H${X(p.date).toFixed(1)} V${Y(p.amount).toFixed(1)}`;
  line += ` H${X(end).toFixed(1)}`;
  const area = `${line} V${H - 22} H${X(points[0].date).toFixed(1)} Z`;
  const years: string[] = [];
  for (let y = Number(points[0].date.slice(0, 4)) + 1; y <= Number(end.slice(0, 4)); y++) years.push(`${y}-01-01`);
  const last = points.at(-1)!;
  return (
    <div ref={box}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block overflow-visible" role="img" aria-label={`What each ${alias} payment cost: from ${formatInr(points[0].amount)} to ${formatInr(last.amount)}`}>
        {years.map((iso) => (
          <g key={iso}>
            <line x1={X(iso)} x2={X(iso)} y1={10} y2={H - 22} stroke="var(--divider)" strokeDasharray="3 3" />
            <text x={X(iso)} y={H - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--muted)">
              {iso.slice(0, 4)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--accent-tint)" opacity={0.6} />
        <path d={line} fill="none" stroke="var(--accent-text)" strokeWidth={2} strokeLinejoin="round" />
        <text x={X(points[0].date)} y={Y(points[0].amount) - 8} fontSize={10.5} fontWeight={700} fill="var(--muted)">
          {formatInr(points[0].amount)}
        </text>
        {changes.map((c, i) => {
          const up = c.to > c.from;
          const color = up ? "var(--negative)" : "var(--positive)";
          return (
            <g key={i}>
              <circle cx={X(c.date)} cy={Y(c.to)} r={4} fill="var(--surface)" stroke={color} strokeWidth={2} />
              <text x={X(c.date) - 8} y={Y(c.to) + 4} textAnchor="end" fontSize={10.5} fontWeight={800} fill={color}>
                {up ? "+" : "−"}
                {formatInr(Math.abs(c.to - c.from))}
              </text>
            </g>
          );
        })}
        <circle cx={X(end)} cy={Y(last.amount)} r={4} fill="var(--accent-text)" />
        <text x={X(end)} y={Y(last.amount) - 9} textAnchor="end" fontSize={11} fontWeight={800} fill="var(--fg)">
          {formatInr(last.amount)}
        </text>
      </svg>
    </div>
  );
}
