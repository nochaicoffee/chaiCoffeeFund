import type { TradeRow } from "@/app/investments/views";
import { WidgetCard } from "../shell/WidgetCard";

/** The latest trades, newest first: buys, sells, RSU vests with the shares sold to cover tax, and ESPP purchases. */
export function RecentTrades({ rows }: { rows: TradeRow[] }) {
  if (rows.length === 0) return null;
  return (
    <WidgetCard label="Recent trades" title="Recent trades" note="newest first">
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-divider py-3 first:border-t-0">
            <span className="text-xs font-bold text-muted">{r.date}</span>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
              <span className="block truncate text-[11px] font-medium text-muted">{r.kind} · {r.detail}</span>
            </span>
            <b className="text-[13px] font-extrabold">{r.total}</b>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
