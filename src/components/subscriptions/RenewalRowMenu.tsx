"use client";

import type { ReactNode } from "react";
import type { RenewalRowView } from "@/app/subscriptions/renewals/views";
import { CloseIcon, MenuAction, MenuLink, RowMenu } from "../RowMenu";
import { useSubscriptionForms } from "./forms/SubscriptionForms";
import { EditIcon, RenewIcon } from "./icons";

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

/** A menu item that writes: with sample data it stays in the menu but disabled, with the reason, as the forms' buttons do. */
function WriteItem(props: { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean }) {
  const { disabledReason } = useSubscriptionForms();
  return <MenuAction {...props} disabledReason={disabledReason} />;
}

/**
 * A renewal's ⋯ menu (SubsRenewalsStates, "A paid row's menu"), drawn like the app's
 * dropdowns. A recorded one offers Edit payment, Open the subscription and Delete
 * payment; one not recorded offers It didn't charge (₹0, Skipped, with Undo) and Open.
 * Choosing an item puts focus back on ⋯ first, so it returns there when a form closes.
 */
export function RenewalRowMenu({ row, openHref }: { row: RenewalRowView; openHref: string }) {
  const { open: openForm, skip } = useSubscriptionForms();
  const alias = row.mark.alias;
  const payment = row.payment;
  const openItem = (
    <MenuLink href={openHref}>
      <RenewIcon size={12} />
      <span className="min-w-0 flex-1 truncate">Open {alias}</span>
    </MenuLink>
  );

  return (
    <RowMenu triggerLabel={`More for ${alias}, ${row.date}`} menuLabel={`${alias}, ${row.date}`}>
      {payment ? (
        <>
          <WriteItem icon={<EditIcon size={12} />} label="Edit payment" onSelect={() => openForm({ kind: "edit-payment", payment })} />
          {openItem}
          <div role="separator" className="mx-2 my-1.5 h-px bg-divider" />
          <WriteItem icon={<CloseIcon />} label="Delete payment" danger onSelect={() => openForm({ kind: "delete-payment", payment })} />
        </>
      ) : (
        <>
          <WriteItem icon={<StopIcon />} label="It didn't charge" onSelect={() => skip(row.subscriptionId, row.renewalDate)} />
          {openItem}
        </>
      )}
    </RowMenu>
  );
}
