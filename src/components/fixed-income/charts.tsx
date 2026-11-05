import type { BuiltUpPoint, DepositBar, EpfBar } from "@/lib/aggregate/fixedIncome";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { formatDate, formatMonthShort } from "@/lib/format/date";

/**
 * The stages' charts: plain bars in HTML, drawn on the stage's own colour (white for what went in, amber for what was earned).
 * Each has a text summary for a screen reader, since the bars carry no numbers of their own.
 */

const AMBER = "var(--card-amber, #f5b942)";
const WHITE = "oklch(1 0 0 / 0.86)";

function Axis({ labels }: { labels: { key: string; text: string }[] }) {
  return (
    <div className="mt-1.5 flex gap-px text-[10px] font-bold text-on-card-faint" aria-hidden="true">
      {labels.map((l) => (
        <span key={l.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
          {l.text}
        </span>
      ))}
    </div>
  );
}

/** What he had built up at the end of each month: EPF in white, the deposits in amber on top. */
export function BuiltUpChart({ points }: { points: BuiltUpPoint[] }) {
  const top = Math.max(1, ...points.map((p) => p.epf + p.deposits));
  const last = points.at(-1);
  return (
    <figure className="m-0">
      <div role="img" aria-label={last ? `Built up month by month, from ${formatMonthShort(points[0].month)} ${points[0].month.slice(0, 4)}: EPF ${formatInrCompact(last.epf)} and deposits ${formatInrCompact(last.deposits)} now` : "Nothing built up yet"} className="flex h-72 items-end gap-px">
        {points.map((p) => (
          <div key={p.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatMonthShort(p.month)} ${p.month.slice(0, 4)}: EPF ${formatInr(p.epf)}${p.deposits ? `, deposits ${formatInr(Math.round(p.deposits))}` : ""}`}>
            <i className="block rounded-t-[2px]" style={{ height: `${(p.deposits / top) * 100}%`, background: AMBER }} />
            <i className="block" style={{ height: `${(p.epf / top) * 100}%`, background: WHITE }} />
          </div>
        ))}
      </div>
      <Axis labels={points.map((p) => ({ key: p.month, text: p.month.endsWith("-01") ? p.month.slice(0, 4) : p.month.endsWith("-07") ? "Jul" : "" }))} />
    </figure>
  );
}

/** What went into EPF each month in white, each March's interest in amber, and the next credit expected, dashed. */
export function EpfChart({ bars }: { bars: EpfBar[] }) {
  const top = Math.max(1, ...bars.map((b) => Math.max(b.put, b.interest)));
  return (
    <figure className="m-0">
      <div role="img" aria-label={`EPF month by month: ${bars.filter((b) => b.interest > 0).map((b) => `${formatInr(b.interest)} interest credited in ${formatMonthShort(b.month)} ${b.month.slice(0, 4)}`).join(", ") || "no interest credited yet"}`} className="flex h-72 items-end gap-px">
        {bars.map((b) => (
          <div key={b.month} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-px" title={`${formatMonthShort(b.month)} ${b.month.slice(0, 4)}: ${b.put ? `${formatInr(b.put)} ${b.expected ? "expected" : "in"}` : ""}${b.interest ? ` · ${formatInr(b.interest)} interest` : ""}`}>
            {b.interest > 0 && <i className="block rounded-t-[2px]" style={{ height: `${(b.interest / top) * 100}%`, background: AMBER }} />}
            {b.put > 0 && <i className="block rounded-t-[2px]" style={{ height: `${(b.put / top) * 100}%`, background: b.expected ? "transparent" : WHITE, border: b.expected ? "1.5px dashed oklch(1 0 0 / 0.7)" : undefined }} />}
          </div>
        ))}
      </div>
      <Axis labels={bars.map((b) => ({ key: b.month, text: b.month.endsWith("-01") ? b.month.slice(0, 4) : b.month.endsWith("-07") ? "Jul" : "" }))} />
    </figure>
  );
}

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** One bar for each deposit from the day it started to the day it matures, how far through it is, and a line for today. */
export function DepositsChart({ bars, today }: { bars: DepositBar[]; today: string }) {
  const from = Math.min(...bars.map((b) => day(b.startDate)));
  const to = Math.max(...bars.map((b) => day(b.maturityDate)));
  const span = Math.max(1, to - from);
  const pct = (iso: string) => ((day(iso) - from) / span) * 100;
  return (
    <figure className="m-0">
      <div role="img" aria-label={`${bars.length} deposits across time: ${bars.map((b) => `${b.name} matures ${formatDate(b.maturityDate)}`).join("; ")}`} className="relative flex min-h-72 flex-col justify-evenly py-1">
        {bars.map((b) => (
          <div key={b.id} className="relative h-6" title={`${b.name}: started ${formatDate(b.startDate)}, matures ${formatDate(b.maturityDate)}, ${Math.round(b.through * 100)}% through`}>
            <i className="absolute inset-y-0 rounded-full" style={{ left: `${pct(b.startDate)}%`, width: `${pct(b.maturityDate) - pct(b.startDate)}%`, background: "oklch(1 0 0 / 0.18)" }} />
            <i className="absolute inset-y-0 rounded-full" style={{ left: `${pct(b.startDate)}%`, width: `${(pct(b.maturityDate) - pct(b.startDate)) * b.through}%`, background: b.due ? AMBER : WHITE }} />
          </div>
        ))}
        <i className="pointer-events-none absolute inset-y-0 w-px" style={{ left: `${Math.min(100, Math.max(0, pct(today)))}%`, background: AMBER }} aria-hidden="true" />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold text-on-card-faint" aria-hidden="true">
        <span>{formatDate(bars.reduce((a, b) => (a.startDate < b.startDate ? a : b)).startDate)}</span>
        <span>today</span>
        <span>{formatDate(bars.reduce((a, b) => (a.maturityDate > b.maturityDate ? a : b)).maturityDate)}</span>
      </div>
    </figure>
  );
}
