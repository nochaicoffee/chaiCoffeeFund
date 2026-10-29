"use client";

import { useState } from "react";
import type { ComingUpView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";
import { Segmented } from "../subscriptions/Segmented";

type Show = "all" | "month" | "later";
const SHOWN = 5;

/** Coming up (InsFinal): renewals, soonest first, a date block each, with a switch for all, within a month, or later. */
export function ComingUpCard({ card, picked, onPick }: { card: ComingUpView; picked: string; onPick: (id: string) => void }) {
  const [show, setShow] = useState<Show>("all");
  const rows = card.rows.filter((r) => (show === "all" ? true : show === "month" ? r.soon : !r.soon)).slice(0, SHOWN);
  return (
    <WidgetCard
      label="Coming up"
      title="Coming up"
      note="renewals, soonest first"
      gap="gap-1.5"
      right={<Segmented label="Show" options={[{ value: "all", label: "All" }, { value: "month", label: "Within a month" }, { value: "later", label: "Later" }]} value={show} onChange={setShow} small />}
    >
      {rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">{card.rows.length === 0 ? "Nothing to renew." : show === "month" ? "Nothing renews within a month." : "Nothing renews later."}</p>
      ) : (
        <ul className="flex flex-1 flex-col">
          {rows.map((r) => (
            <li key={r.id} className={`border-t border-divider first:border-t-0 motion-safe:transition-opacity ${picked !== "all" && picked !== r.policyId ? "opacity-40" : ""}`}>
              <button type="button" onClick={() => onPick(r.policyId)} className="flex w-full items-center gap-3.5 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                <span className={`flex w-12 shrink-0 flex-col items-center rounded-[12px] py-1.5 ${r.soon ? "bg-warning-tint text-warning-text" : "bg-fill"}`}>
                  <b className="text-lg leading-none font-extrabold">{r.day}</b>
                  <span className="text-[10px] font-extrabold">{r.month}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px] font-extrabold">{r.title}</b>
                  <span className="block text-[11.5px] font-semibold text-muted">
                    <span className={r.soon ? "font-extrabold text-warning-text" : ""}>{r.when}</span> · {r.detail}
                  </span>
                </span>
                <b className="shrink-0 text-[15px] font-extrabold tabular-nums">{r.amount}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 text-xs font-semibold text-muted">
        <span>{card.foot}</span>
        <span className="rounded-full bg-fill px-2.5 py-1 text-[11px] font-extrabold">From each policy&apos;s dates</span>
      </div>
    </WidgetCard>
  );
}
