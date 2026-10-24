"use client";

import type { AttentionItem } from "@/app/accounts/attentionView";
import { useReview } from "./ReviewDialog";

/** The mark on a balance a bank statement disagreed with. It opens the choice: keep the Sheet's balance or take the statement's. */
export function NeedsAttentionChip({ item }: { item: AttentionItem }) {
  const { open } = useReview();
  return (
    <button
      type="button"
      onClick={() => open(item)}
      aria-label={`Needs attention: the statement says ${item.statementText} on ${item.dateText}. Choose which to keep`}
      className="inline-flex min-h-6 items-center gap-1 rounded-full bg-warning-tint px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-warning-text hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent max-md:min-h-9"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
      Needs attention
    </button>
  );
}
