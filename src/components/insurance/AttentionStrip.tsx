"use client";

import type { AttentionItem } from "@/app/insurance/views";
import { FormTrigger, SMALL_OK, useInsuranceForms } from "./forms/InsuranceForms";

/**
 * The strip under the Insurance greeting while a policy has lapsed (red) or renews within a month (amber), one line each,
 * lapsed first (docs/design/insurance.md). See policy picks the policy and brings the cover map into view.
 */
export function AttentionStrip({ items, onSee }: { items: AttentionItem[]; onSee: (policyId: string) => void }) {
  const { open } = useInsuranceForms();
  if (items.length === 0) return null;
  const lapsed = items.some((item) => item.tone === "lapsed");
  return (
    <section aria-label="Needs attention" className={`flex flex-col gap-2 rounded-[18px] border px-4 py-3 md:px-5 ${lapsed ? "border-negative/30 bg-negative-tint" : "border-warning/30 bg-warning-tint"}`}>
      {items.map((item) => (
        <div key={item.policyId} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className={`flex min-w-0 flex-1 basis-full items-start gap-2.5 text-[13px] font-semibold sm:basis-auto ${item.tone === "lapsed" ? "text-negative" : "text-warning-text"}`}>
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <b className="font-extrabold">{item.name}</b> {item.text}
            </span>
          </p>
          <FormTrigger className={SMALL_OK} label="↻ Renew" onClick={() => open({ kind: "renew", policyId: item.policyId })} />
          <button
            type="button"
            onClick={() => {
              onSee(item.policyId);
              document.getElementById("cover-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="min-h-8 rounded-full bg-surface px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent"
          >
            See policy
          </button>
        </div>
      ))}
    </section>
  );
}
