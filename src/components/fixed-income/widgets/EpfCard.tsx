"use client";

import type { EpfCardView } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";
import { AddEpfStatementButton } from "../AddEpfStatementButton";

/** The EPF card (J1): each share as the passbook says, this year's contributions, the interest not credited yet and each year credited. */
export function EpfCard({ view }: { view: EpfCardView }) {
  return (
    <WidgetCard label="Provident fund" title="Provident fund (EPF)" note={`${view.account} · from your EPFO passbook`} right={<AddEpfStatementButton />}>
      <dl className="grid grid-cols-3 gap-2.5">
        {view.tiles.map((t) => (
          <div key={t.label} className="rounded-[14px] bg-fill p-3.5 max-md:p-3">
            <dt className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">{t.label}</dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums max-md:text-base">{t.value}</dd>
            <dd className="mt-0.5 text-[11px] font-medium text-muted">{t.note}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col">
        {view.rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-3 border-t border-divider py-2.5 first:border-t-0">
            <span className="min-w-0">
              <b className="block text-[13px] font-extrabold">{r.label}</b>
              <span className="block text-[11px] font-medium text-muted">{r.note}</span>
            </span>
            <b className="text-[13px] font-extrabold whitespace-nowrap tabular-nums">{r.value}</b>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
