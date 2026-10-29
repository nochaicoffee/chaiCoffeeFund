"use client";

import type { DetailsView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";
import { FormTrigger, SMALL_OK, SMALL_SOFT, useInsuranceForms } from "./forms/InsuranceForms";
import { TileMark } from "./parts";

const STATE_PILL: Record<DetailsView["state"], string> = {
  "In force": "bg-positive-tint text-positive",
  "Renew soon": "bg-warning-tint text-warning-text",
  Lapsed: "bg-negative-tint text-negative",
  Cancelled: "bg-fill text-muted",
  "Not started": "bg-fill text-muted",
  "No term": "bg-fill text-muted",
};

/** Policy details (InsFinal), following the pick: what you'd look up when you need to claim. Under All policies it shows the next to renew. */
export function DetailsCard({ view }: { view: DetailsView | null }) {
  const { open } = useInsuranceForms();
  return (
    <WidgetCard label="Policy details" title="Policy details" note="what you'd look up when you need to claim" gap="gap-4">
      {!view ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">Pick a policy once one is recorded.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3.5">
            <TileMark icon={view.icon} colorKey={view.colorKey} size={46} />
            <span className="min-w-0 flex-1">
              <b className="block text-[17px] leading-tight font-extrabold">{view.name}</b>
              <small className="block text-[12.5px] font-semibold text-muted">{view.sub}</small>
            </span>
            <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${STATE_PILL[view.state]}`}>{view.stateText}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {view.fields.map((f) => (
              <div key={f.key} className={`flex min-w-0 flex-col gap-0.5 ${f.full ? "sm:col-span-2" : ""}`}>
                <dt className="text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase">{f.label}</dt>
                <dd className={`text-sm leading-snug ${f.quiet ? "font-semibold text-muted" : "font-bold"}`}>
                  {f.href ? (
                    <a href={f.href} target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                      {f.value}
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {view.addOns.length > 0 && (
            <div>
              <span className="mb-2 block text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase">Add-ons and covers</span>
              <ul className="flex flex-wrap gap-2">
                {view.addOns.map((a) => (
                  <li key={a} className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-xs font-bold">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--positive)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-auto flex flex-col gap-3 border-t border-divider pt-3">
            <div className="flex flex-wrap gap-2">
              {view.state === "Cancelled" ? (
                <FormTrigger className={SMALL_OK} label="↻ Restart" onClick={() => open({ kind: "restart", id: view.policyId })} />
              ) : (
                <FormTrigger className={SMALL_OK} label="↻ Renew" onClick={() => open({ kind: "renew", policyId: view.policyId })} />
              )}
              <FormTrigger className={SMALL_SOFT} label="Edit" onClick={() => open({ kind: "edit", id: view.policyId })} />
              {view.state !== "Cancelled" && <FormTrigger className={SMALL_SOFT} label="Cancel policy" onClick={() => open({ kind: "cancel", policyId: view.policyId })} />}
              <FormTrigger className={SMALL_SOFT} label="Delete" onClick={() => open({ kind: "delete", id: view.policyId })} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted">
              <span>{view.foot}</span>
              {view.note && <span>{view.note}</span>}
            </div>
          </div>
        </>
      )}
    </WidgetCard>
  );
}
