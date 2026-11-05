import type { CreditsView } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";

const TONE: Record<string, string> = {
  ok: "bg-positive text-on-accent",
  warn: "bg-[var(--card-amber,#e0a21a)] text-white",
  late: "bg-negative text-on-accent",
  due: "border-2 border-dashed border-muted text-muted",
  none: "bg-heat-no-data",
};
const KEY = [
  ["bg-positive", "1 to 2 days"],
  ["bg-[var(--card-amber,#e0a21a)]", "3 to 20 days"],
  ["bg-negative", "over 20 days"],
] as const;

/** Credits on time (J1): a dot for each wage month with the days to its credit, and the passbook check under it. */
export function CreditsCard({ view }: { view: CreditsView }) {
  return (
    <WidgetCard label="Credits on time" title="Credits on time" note="days from the end of the wage month to the day EPFO credited it">
      <div className="flex flex-col gap-2">
        {view.rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2">
            <span className="text-[11px] font-bold text-muted">{row.label}</span>
            <div className="grid grid-cols-12 gap-1.5">
              {row.dots.map((d) => (
                <span key={d.wageMonth} title={d.title} className={`flex aspect-square min-w-0 items-center justify-center rounded-full text-[10px] font-extrabold tabular-nums ${TONE[d.tone]} ${d.typed ? "outline-1 outline-offset-1 outline-dashed outline-fg" : ""}`}>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
        {KEY.map(([cls, text]) => (
          <span key={text} className="flex items-center gap-1.5">
            <i aria-hidden="true" className={`size-2.5 rounded-full ${cls}`} />
            {text}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i aria-hidden="true" className="size-2.5 rounded-full border border-dashed border-muted" />
          due
        </span>
      </div>
      {view.note && <p className="text-xs font-medium text-muted">{view.note}</p>}
      <div className="flex flex-col gap-1.5 border-t border-divider pt-3">
        <div className="flex justify-between text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">
          <span>Passbook check</span>
          <span className="normal-case">opening + credits + interest = closing</span>
        </div>
        {view.checks.map((c) => (
          <div key={c.label} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
            <span className="font-bold">{c.label}</span>
            <span className="min-w-0 flex-1 text-muted tabular-nums">{c.equation}</span>
            <span className={`font-extrabold ${c.status === "typed" ? "text-warning-text" : c.status === "so far" ? "text-muted" : "text-positive"}`} title={c.detail}>
              {c.status === "adds up" ? "✓ adds up" : c.status === "so far" ? "so far" : "includes typed rows"}
            </span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
