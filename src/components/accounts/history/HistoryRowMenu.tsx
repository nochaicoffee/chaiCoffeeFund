"use client";

import type { ReactNode } from "react";
import type { HistoryRowView } from "@/app/accounts/history/views";
import { MENU_ITEM as ITEM, RowMenu, useRowMenu } from "../../RowMenu";
import { EditIcon } from "../../subscriptions/icons";
import { useAccountForms } from "../forms/AccountForms";

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** A menu item that writes: with sample data it stays but disabled, with the reason, as the other forms' buttons do. */
function WriteItem({ icon, label, onSelect, danger = false, unavailable }: { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean; unavailable?: string }) {
  const { disabledReason } = useAccountForms();
  const { choose } = useRowMenu();
  const reason = disabledReason ?? unavailable;
  return (
    <button type="button" role="menuitem" tabIndex={-1} aria-disabled={reason ? true : undefined} title={reason} onClick={reason ? undefined : () => choose(onSelect)} className={`${ITEM} ${reason ? "cursor-not-allowed" : "hover:bg-fill"} ${danger ? "text-negative" : ""}`}>
      <span className={reason ? "opacity-60" : ""}>{icon}</span>
      <span className={`flex-1 ${reason ? "opacity-60" : ""}`}>{label}</span>
      {reason && <span className="sr-only">{` (${reason})`}</span>}
    </button>
  );
}

/**
 * A balance's ⋯ menu on the Balance history page (#177), on the shared RowMenu: Edit balance and
 * Delete balance through the Accounts forms, and Update balance for its account, which a closed
 * account can't take.
 */
export function HistoryRowMenu({ row }: { row: HistoryRowView }) {
  const { open: openForm } = useAccountForms();
  const label = `${row.name}, ${row.row.dateText}`;
  return (
    <RowMenu triggerLabel={`More for ${label}`} menuLabel={label}>
      <WriteItem icon={<EditIcon size={12} />} label="Edit balance" onSelect={() => openForm({ kind: "edit-balance", row: row.row })} />
      <WriteItem icon={<span className="text-[12px] font-extrabold">₹</span>} label={`Update ${row.name}`} unavailable={row.closed ? "It's closed. Reopen it first" : undefined} onSelect={() => openForm({ kind: "balance", id: row.accountId })} />
      <div role="separator" className="mx-2 my-1.5 h-px bg-divider" />
      <WriteItem icon={<XIcon />} label="Delete balance" danger onSelect={() => openForm({ kind: "delete-balance", row: row.row })} />
    </RowMenu>
  );
}
