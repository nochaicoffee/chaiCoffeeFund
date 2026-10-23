"use client";

import type { AttentionItem } from "@/app/accounts/attentionView";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { AlertIcon } from "../cards/forms/icons";
import { useReview } from "./ReviewDialog";

/**
 * The balances a bank statement disagreed with, above the rest of the Accounts page until each is
 * answered: the account, the day, what the Sheet has against what the statement says, and the
 * button that opens the choice. Nothing shows when nothing is waiting.
 */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
  const { open } = useReview();
  if (items.length === 0) return null;
  return (
    <section aria-label="Balances that need a look" className="flex flex-col gap-1 rounded-[22px] border border-warning/40 bg-warning-tint p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-warning-text">
        <AlertIcon />
        {items.length === 1 ? "A statement disagrees with a balance" : `${items.length} statements disagree with balances`}
      </h2>
      <p className="text-xs font-medium text-warning-text/80">Your Sheet keeps its own balance until you choose.</p>
      <ul className="mt-2 flex flex-col divide-y divide-warning/25">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[4px]" style={{ background: colorGradient(i.colorKey) }} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13px] font-extrabold text-fg">
                {i.accountName} · {i.dateText}
              </b>
              <span className="block text-[11px] font-semibold text-muted">
                Sheet {i.recordedText}, statement {i.statementText} ({i.differenceText})
              </span>
            </span>
            <button type="button" onClick={() => open(i)} className="min-h-11 rounded-full bg-surface px-4 text-xs font-bold text-fg shadow-soft hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent md:min-h-9">
              Review
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
