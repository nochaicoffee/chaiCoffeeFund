"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { RenewalRowView } from "@/app/subscriptions/renewals/views";
import { popoverPlacement } from "../listbox";
import { useSubscriptionForms } from "./forms/SubscriptionForms";
import { EditIcon, MoreIcon, RenewIcon } from "./icons";

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const StopIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

const ITEM = "flex min-h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] font-bold outline-none focus-visible:bg-fill max-md:min-h-11";

/** A menu item that writes: with sample data it stays in the menu but disabled, with the reason, as the forms' buttons do. */
function WriteItem({ icon, label, onSelect, danger = false }: { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean }) {
  const { disabledReason } = useSubscriptionForms();
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabledReason ? true : undefined}
      title={disabledReason}
      onClick={disabledReason ? undefined : onSelect}
      className={`${ITEM} ${disabledReason ? "cursor-not-allowed" : "hover:bg-fill"} ${danger ? "text-negative" : ""}`}
    >
      <span className={disabledReason ? "opacity-60" : ""}>{icon}</span>
      <span className={`flex-1 ${disabledReason ? "opacity-60" : ""}`}>{label}</span>
      {disabledReason && <span className="sr-only">{` (${disabledReason})`}</span>}
    </button>
  );
}

/**
 * A renewal's ⋯ menu (SubsRenewalsStates, "A paid row's menu"), drawn like the app's
 * dropdowns. A recorded one offers Edit payment, Open the subscription and Delete
 * payment; one not recorded offers It didn't charge (₹0, Skipped, with Undo) and Open.
 * Choosing an item puts focus back on ⋯ first, so it returns there when a form closes.
 */
export function RenewalRowMenu({ row, openHref }: { row: RenewalRowView; openHref: string }) {
  const { open: openForm, skip } = useSubscriptionForms();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const alias = row.mark.alias;

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }
  const choose = (run: () => void) => {
    close(true);
    run();
  };

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!open || !menu || !trigger) return;
    if (typeof menu.showPopover === "function" && !menu.matches(":popover-open")) menu.showPopover();
    const place = () => {
      const at = popoverPlacement(trigger.getBoundingClientRect(), { width: menu.offsetWidth, height: menu.offsetHeight }, { width: document.documentElement.clientWidth, height: window.innerHeight }, "end");
      menu.style.top = `${at.top}px`;
      menu.style.left = `${at.left}px`;
      menu.dataset.side = at.side;
    };
    place();
    menu.querySelector<HTMLElement>("[role=menuitem]:not([aria-disabled])")?.focus();
    const pressOutside = (e: PointerEvent) => {
      if (e.target instanceof Node && !menu.contains(e.target) && !trigger.contains(e.target)) setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", pressOutside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", pressOutside);
    };
  }, [open]);

  // Arrow keys move between the items, Home and End jump, Esc closes with focus back on ⋯, Tab closes.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => items[(i + items.length) % items.length]?.focus();
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape") close(true);
    else if (e.key === "Tab") return setOpen(false);
    else return;
    e.preventDefault();
  }

  const payment = row.payment;
  const openItem = (
    <Link href={openHref} role="menuitem" tabIndex={-1} className={`${ITEM} hover:bg-fill`} onClick={() => setOpen(false)}>
      <RenewIcon size={12} />
      <span className="min-w-0 flex-1 truncate">Open {alias}</span>
    </Link>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={`More for ${alias}, ${row.date}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent aria-expanded:bg-fill aria-expanded:text-fg"
      >
        <MoreIcon />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          popover="manual"
          role="menu"
          aria-label={`${alias}, ${row.date}`}
          data-side="bottom"
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== triggerRef.current) setOpen(false);
          }}
          className="fixed inset-auto m-0 flex w-[220px] max-w-[calc(100vw-32px)] origin-top-right flex-col rounded-[16px] border border-surface-line bg-surface p-1.5 text-fg shadow-pop data-[side=top]:origin-bottom-right data-[side=top]:[--pop-from:4px] motion-safe:animate-pop-in"
        >
          {payment ? (
            <>
              <WriteItem icon={<EditIcon size={12} />} label="Edit payment" onSelect={() => choose(() => openForm({ kind: "edit-payment", payment }))} />
              {openItem}
              <div role="separator" className="mx-2 my-1.5 h-px bg-divider" />
              <WriteItem icon={<XIcon />} label="Delete payment" danger onSelect={() => choose(() => openForm({ kind: "delete-payment", payment }))} />
            </>
          ) : (
            <>
              <WriteItem icon={<StopIcon />} label="It didn't charge" onSelect={() => choose(() => skip(row.subscriptionId, row.renewalDate))} />
              {openItem}
            </>
          )}
        </div>
      )}
    </>
  );
}
