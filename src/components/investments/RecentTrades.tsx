"use client";

import type { TradeRow } from "@/app/investments/views";
import { WidgetCard } from "../shell/WidgetCard";
import { useTradeForms } from "./TradeForms";

/** The latest trades, newest first: buys, sells, RSU vests with the shares sold to cover tax, and ESPP purchases. Each opens its form to edit or delete. */
export function RecentTrades({ rows }: { rows: TradeRow[] }) {
  const { open } = useTradeForms();
  if (rows.length === 0) return null;
  return (
    <WidgetCard label="Recent trades" title="Recent trades" note="newest first · pick one to edit or delete it">
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.id} className="border-t border-divider first:border-t-0">
            <button type="button" onClick={() => open({ kind: "edit", id: r.id })} aria-label={`Edit ${r.kind}: ${r.name}, ${r.date}`} className="grid w-full grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-1 py-3 text-left hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent">
              <span className="text-xs font-bold text-muted">{r.date}</span>
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                <span className="block truncate text-[11px] font-medium text-muted">{r.kind} · {r.detail}</span>
              </span>
              <b className="text-[13px] font-extrabold">{r.total}</b>
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
