"use client";

import type { RenewalRowView } from "@/app/subscriptions/renewals/views";
import { FormTrigger, useSubscriptionForms } from "./forms/SubscriptionForms";
import { CheckIcon } from "./icons";
import { RenewalRowMenu } from "./RenewalRowMenu";

const LOOK = {
  /** Mark paid on the renewal due within 3 days. */
  accent: "inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-accent-tint px-3 text-xs font-bold whitespace-nowrap text-accent-text hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-accent",
  /** Record payment on a renewal not recorded. */
  ghost: "inline-flex min-h-[30px] shrink-0 items-center rounded-full border border-surface-line bg-surface px-3 text-xs font-bold whitespace-nowrap text-fg shadow-soft hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent",
  /** The phone's text-only Mark paid and Record. */
  link: "inline-flex min-h-11 shrink-0 items-center px-1 text-xs font-bold whitespace-nowrap text-accent-text focus-visible:outline-2 focus-visible:outline-accent md:min-h-0",
  warningLink: "inline-flex min-h-11 shrink-0 items-center px-1 text-xs font-bold whitespace-nowrap text-warning-text focus-visible:outline-2 focus-visible:outline-accent md:min-h-0",
} as const;

/**
 * A renewal row's action (SubsRenewals.dc.html), through the Subscriptions forms (#128):
 * Mark paid in one click on the renewal it pays, Record payment (starting on this
 * renewal) on one not recorded, and the ⋯ menu. On a phone the design has the short
 * text buttons and no menu; between phone and desktop the compact rows keep the menu.
 */
export function RenewalRowActions({ row, openHref, phone = false }: { row: RenewalRowView; openHref: string; phone?: boolean }) {
  const { open, markPaid, saving } = useSubscriptionForms();
  let primary = null;
  if (row.action === "mark-paid")
    primary = <FormTrigger className={phone ? LOOK.link : LOOK.accent} icon={phone ? undefined : <CheckIcon />} label="Mark paid" busy={saving === row.subscriptionId} onClick={() => markPaid(row.subscriptionId)} />;
  else if (row.action === "record-payment")
    primary = (
      <FormTrigger
        className={phone ? LOOK.warningLink : LOOK.ghost}
        label={phone ? "Record" : "Record payment"}
        busy={saving === `${row.subscriptionId}:${row.renewalDate}`}
        onClick={() => open({ kind: "record", id: row.subscriptionId, renewalDate: row.renewalDate })}
      />
    );
  const hasMenu = row.action === "record-payment" || row.action === "payment-menu";
  // One wrapper with the menu always in its second place, so when a write changes the row
  // (recorded, deleted, didn't charge) the ⋯ stays mounted and keeps focus.
  return (
    <span className="flex items-center gap-1">
      {primary}
      {hasMenu && (
        <span className={phone ? "max-md:hidden" : "contents"}>
          <RenewalRowMenu row={row} openHref={openHref} />
        </span>
      )}
    </span>
  );
}
