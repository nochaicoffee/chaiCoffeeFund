import type { SameMoneyRow, Tone } from "@/app/investments/views";
import { WidgetCard } from "../shell/WidgetCard";

const TONE: Record<Tone, string> = { gain: "text-positive", loss: "text-negative", plain: "text-muted" };

/**
 * The same money, somewhere else (docs/design/investments.md): each of his buys and sales put into Nifty 50, the S&P 500 or a deposit on its
 * own day, against what he has. A counterfactual, never advice.
 */
export function SameMoney({ rows }: { rows: SameMoneyRow[] }) {
  if (rows.length === 0) return null;
  return (
    <WidgetCard label="The same money, somewhere else" title="The same money, somewhere else" note="your buys and sales, on their own dates" gap="gap-3.5">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <i aria-hidden="true" className="block size-[9px] shrink-0 rounded-[3px]" style={{ background: r.colour }} />
              <span className={r.you ? "font-extrabold" : ""}>{r.label}</span>
            </span>
            <b className="font-extrabold tabular-nums">{r.value}</b>
          </div>
          <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-fill">
            <i className="block h-full rounded-full" style={{ width: `${r.fraction * 100}%`, background: r.colour }} />
          </span>
          <small className={`text-[11.5px] font-bold ${TONE[r.tone]}`}>{r.note}</small>
        </div>
      ))}
      <p className="border-t border-divider pt-2.5 text-[11px] font-semibold text-muted">A counterfactual, never advice: each buy and sale put into the line on its own day. An RSU vest counts as a buy at fair value. Gold isn&apos;t shown: there is no gold price saved to work it from.</p>
    </WidgetCard>
  );
}
