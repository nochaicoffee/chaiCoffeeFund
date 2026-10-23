"use client";

import type { ReactNode } from "react";
import type { HistoryRowView } from "@/app/accounts/history/views";
import { CloseIcon, MenuAction, RowMenu } from "../../RowMenu";
import { EditIcon } from "../../subscriptions/icons";
import { useAccountForms } from "../forms/AccountForms";

/** A menu item that writes: with sample data (or, for Update, a closed account) it stays but disabled, with the reason. */
function WriteItem({ unavailable, ...props }: { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean; unavailable?: string }) {
  const { disabledReason } = useAccountForms();
  return <MenuAction {...props} disabledReason={disabledReason ?? unavailable} />;
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
      <WriteItem icon={<CloseIcon />} label="Delete balance" danger onSelect={() => openForm({ kind: "delete-balance", row: row.row })} />
    </RowMenu>
  );
}
