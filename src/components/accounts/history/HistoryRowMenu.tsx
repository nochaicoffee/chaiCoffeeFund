"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { HistoryRowView } from "@/app/accounts/history/views";
import { popoverPlacement } from "../../listbox";
import { EditIcon, MoreIcon } from "../../subscriptions/icons";
import { useAccountForms } from "../forms/AccountForms";

const ITEM = "flex min-h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] font-bold outline-none focus-visible:bg-fill max-md:min-h-11";

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** A menu item that writes: with sample data it stays but disabled, with the reason, as the other forms' buttons do. */
function WriteItem({ icon, label, onSelect, danger = false, unavailable }: { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean; unavailable?: string }) {
  const { disabledReason } = useAccountForms();
  const reason = disabledReason ?? unavailable;
  return (
    <button type="button" role="menuitem" tabIndex={-1} aria-disabled={reason ? true : undefined} title={reason} onClick={reason ? undefined : onSelect} className={`${ITEM} ${reason ? "cursor-not-allowed" : "hover:bg-fill"} ${danger ? "text-negative" : ""}`}>
      <span className={reason ? "opacity-60" : ""}>{icon}</span>
      <span className={`flex-1 ${reason ? "opacity-60" : ""}`}>{label}</span>
      {reason && <span className="sr-only">{` (${reason})`}</span>}
    </button>
  );
}

/**
 * A balance's ⋯ menu on the Balance history page (#177, drawn like the Renewals row menu): Edit
 * balance and Delete balance through the Accounts forms, and Update balance for its account,
 * which a closed account can't take. Choosing an item puts focus back on ⋯ first, so it returns
 * there when a form closes.
 */
export function HistoryRowMenu({ row }: { row: HistoryRowView }) {
  const { open: openForm } = useAccountForms();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const label = `${row.name}, ${row.row.dateText}`;

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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={`More for ${label}`}
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
          aria-label={label}
          data-side="bottom"
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== triggerRef.current) setOpen(false);
          }}
          className="fixed inset-auto m-0 flex w-[220px] max-w-[calc(100vw-32px)] origin-top-right flex-col rounded-[16px] border border-surface-line bg-surface p-1.5 text-fg shadow-pop data-[side=top]:origin-bottom-right data-[side=top]:[--pop-from:4px] motion-safe:animate-pop-in"
        >
          <WriteItem icon={<EditIcon size={12} />} label="Edit balance" onSelect={() => choose(() => openForm({ kind: "edit-balance", row: row.row }))} />
          <WriteItem icon={<span className="text-[12px] font-extrabold">₹</span>} label={`Update ${row.name}`} unavailable={row.closed ? "It's closed. Reopen it first" : undefined} onSelect={() => choose(() => openForm({ kind: "balance", id: row.accountId }))} />
          <div role="separator" className="mx-2 my-1.5 h-px bg-divider" />
          <WriteItem icon={<XIcon />} label="Delete balance" danger onSelect={() => choose(() => openForm({ kind: "delete-balance", row: row.row }))} />
        </div>
      )}
    </>
  );
}
