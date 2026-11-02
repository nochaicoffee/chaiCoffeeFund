"use client";

import type { AttentionItem } from "@/lib/goals/attention";
import { ActionButton, useGoalsForms } from "./forms/GoalsForms";

/** The strip under the greeting while a Fixed date is at risk, a date has passed, or an account can't cover its earmarks: red first, then amber, one line each. */
export function AttentionStrip({ items, onSee }: { items: AttentionItem[]; onSee: (goalId: string) => void }) {
  const { open } = useGoalsForms();
  if (items.length === 0) return null;
  const late = items.some((item) => item.tone === "negative");
  return (
    <section aria-label="Needs attention" className={`flex flex-col gap-2 rounded-[18px] border px-4 py-3 md:px-5 ${late ? "border-negative/30 bg-negative-tint" : "border-warning/30 bg-warning-tint"}`}>
      {items.map((item, i) => (
        <div key={`${item.id}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className={`flex min-w-0 flex-1 basis-full items-start gap-2.5 text-[13px] font-semibold sm:basis-auto ${item.tone === "negative" ? "text-negative" : "text-warning-text"}`}>
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <b className="font-extrabold">{item.label}</b>: {item.detail}
            </span>
          </p>
          {item.left > 0 && <ActionButton label="Set aside" onClick={() => open({ kind: "set-aside", goalId: item.id, amount: item.left })} />}
          {item.id !== "all" && <ActionButton label="See goal" tone="ghost" onClick={() => onSee(item.id)} />}
        </div>
      ))}
    </section>
  );
}
