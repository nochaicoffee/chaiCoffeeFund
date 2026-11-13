"use client";

import type { TransferRow } from "@/app/investments/transferView";
import { WidgetCard } from "../shell/WidgetCard";
import { useTradeForms } from "./TradeForms";

/** The newest transfers between his banks and his brokers, either way. Each opens its form to edit or delete; Add transfer is in the header. */
export function TransfersCard({ rows }: { rows: TransferRow[] }) {
  const { open } = useTradeForms();
  if (rows.length === 0) return null;
  return (
    <WidgetCard label="Transfers" title="Transfers to and from your brokers" note="newest first · pick one to edit or delete it" gap="gap-3">
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.id} className="border-t border-divider first:border-t-0">
            <button type="button" onClick={() => open({ kind: "editTransfer", id: r.id })} aria-label={`Edit transfer: ${r.title}, ${r.date}`} className="grid w-full cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent">
              <span className="text-xs font-bold text-muted">{r.date}</span>
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{r.title}</b>
                <span className="block truncate text-[11px] font-medium text-muted">{r.detail}</span>
              </span>
              <b className="text-[13px] font-extrabold tabular-nums">{r.amountText}</b>
            </button>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
