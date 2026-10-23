"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { popoverPlacement } from "./listbox";
import { nextMenuIndex } from "./rowMenuKeys";

/** The look of one item in a row menu, for the pages' own items to wear. */
export const MENU_ITEM = "flex min-h-9 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] font-bold outline-none focus-visible:bg-fill max-md:min-h-11";

const iconProps = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** The ✕ of a Delete item. */
export const CloseIcon = () => (
  <svg {...iconProps}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MoreDots = () => (
  <svg {...iconProps} width={16} height={16} strokeWidth={2.6}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);

/** What a row menu gives its items: how to run something and close, and how to just close. */
interface RowMenuControls {
  /** Closes the menu with focus back on ⋯ first, so it returns there when a form closes, then runs `run`. */
  choose: (run: () => void) => void;
  /** Closes the menu without moving focus, for an item that navigates (a link). */
  dismiss: () => void;
}

const MenuContext = createContext<RowMenuControls | null>(null);

/** For the items inside a RowMenu: choose(run) closes the menu with focus back on ⋯, then runs. */
export function useRowMenu(): RowMenuControls {
  const controls = useContext(MenuContext);
  if (!controls) throw new Error("useRowMenu needs a RowMenu");
  return controls;
}

/** An item that goes to another page: closes the menu where it is, without moving focus. */
export function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  const { dismiss } = useRowMenu();
  return (
    <Link href={href} role="menuitem" tabIndex={-1} className={`${MENU_ITEM} hover:bg-fill`} onClick={dismiss}>
      {children}
    </Link>
  );
}

/**
 * An item that does something (opens a form, writes). With a `disabledReason` (sample data, a closed
 * account) it stays in the menu but disabled, with the reason as its tooltip and for screen readers.
 */
export function MenuAction({ icon, label, onSelect, danger = false, disabledReason }: { icon: ReactNode; label: string; onSelect: () => void; danger?: boolean; disabledReason?: string }) {
  const { choose } = useRowMenu();
  return (
    <button type="button" role="menuitem" tabIndex={-1} aria-disabled={disabledReason ? true : undefined} title={disabledReason} onClick={disabledReason ? undefined : () => choose(onSelect)} className={`${MENU_ITEM} ${disabledReason ? "cursor-not-allowed" : "hover:bg-fill"} ${danger ? "text-negative" : ""}`}>
      <span className={disabledReason ? "opacity-60" : ""}>{icon}</span>
      <span className={`flex-1 ${disabledReason ? "opacity-60" : ""}`}>{label}</span>
      {disabledReason && <span className="sr-only">{` (${disabledReason})`}</span>}
    </button>
  );
}

/**
 * A row's ⋯ menu, drawn like the app's dropdowns (the Renewals and Balance history pages share it).
 * The page supplies the items (which use useRowMenu, or MenuLink); this holds the rest: the ⋯ button, the popover placed under it (or
 * above, when there's no room), and the keyboard. Arrow keys move between the items, Home and End
 * jump, Esc closes with focus back on ⋯, Tab closes, and pressing outside closes. ArrowDown on ⋯
 * opens it, and the first item that isn't disabled takes focus.
 */
export function RowMenu({ triggerLabel, menuLabel, children }: { triggerLabel: string; menuLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const choose = useCallback(
    (run: () => void) => {
      close(true);
      run();
    },
    [close],
  );
  const controls = useMemo(() => ({ choose, dismiss: () => setOpen(false) }), [choose]);

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

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = nextMenuIndex(e.key, at, items.length);
    if (next !== null) items[next]?.focus();
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
        aria-label={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent aria-expanded:bg-fill aria-expanded:text-fg"
      >
        <MoreDots />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          popover="manual"
          role="menu"
          aria-label={menuLabel}
          data-side="bottom"
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            if (e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== triggerRef.current) setOpen(false);
          }}
          className="fixed inset-auto m-0 flex w-[220px] max-w-[calc(100vw-32px)] origin-top-right flex-col rounded-[16px] border border-surface-line bg-surface p-1.5 text-fg shadow-pop data-[side=top]:origin-bottom-right data-[side=top]:[--pop-from:4px] motion-safe:animate-pop-in"
        >
          <MenuContext.Provider value={controls}>{children}</MenuContext.Provider>
        </div>
      )}
    </>
  );
}
