"use client";

import Link from "next/link";
import type { HistoryRow, PickView } from "@/app/accounts/views";
import { useAccountForms } from "./forms/AccountForms";
import { NeedsAttentionChip } from "./NeedsAttentionChip";

const FIRST = 8;

/**
 * Balance history (docs/design/accounts.md): the pick's recorded balances, newest first, each
 * with what it changed from the one before and the gap between them. For All, every account's
 * readings with the account's name. Editing a row comes with the forms (#165).
 */
export function HistoryCard({ pick, rows, href }: { pick: PickView; rows: HistoryRow[]; href: string }) {
  const { open, disabledReason } = useAccountForms();
  const shown = rows.slice(0, FIRST);
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="Balance history">
      <h2 className="text-[15px] font-extrabold">
        Balance history <small className="ml-2 text-xs font-semibold text-muted">{pick.kind === "all" ? "Every account" : pick.name}</small>
      </h2>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm font-semibold text-muted">{pick.kind === "all" ? "No balances recorded yet." : "No balances yet. Add its first balance and it shows here."}</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-divider">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold">{pick.kind === "all" ? `${r.accountName} · ${r.dateText}` : r.dateText}</b>
                {r.gapText && <span className="block text-[11px] font-semibold text-muted">{r.gapText}</span>}
              </span>
              {r.attention && <NeedsAttentionChip item={r.attention} />}
              {!disabledReason && (
                <button type="button" onClick={() => open({ kind: "edit-balance", row: r })} aria-label={`Edit the ${r.dateText} balance`} className="rounded-full px-2 py-1 text-[11px] font-bold text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent">
                  Edit
                </button>
              )}
              <span className="text-right">
                <b className="block text-[13px] font-extrabold tabular-nums">{r.balanceText}</b>
                <span className={`text-[11px] font-bold ${r.changeTone === "up" ? "text-positive" : r.changeTone === "down" ? "text-negative" : "text-muted"}`}>{r.changeText}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <Link href={href} className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-accent-text focus-visible:outline-2 focus-visible:outline-accent">
          View all balances
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </section>
  );
}
