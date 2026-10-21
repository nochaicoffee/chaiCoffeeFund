"use client";

import { Fragment, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { edgeIndex, popoverPlacement, stepIndex, typeaheadIndex } from "./listbox";

export interface SelectOption {
  value: string;
  label: string;
  /** What the closed control shows for this option, when it isn't the label. */
  display?: string;
  /** Muted text at the option's right, such as a period's spend. */
  meta?: string;
  disabled?: boolean;
  /** Starts a group of options under this heading, such as "Quick ranges". */
  group?: string;
  /** Draws a line above the option. */
  divider?: boolean;
  /** Choosing it calls onAction instead of changing the value, as "Custom range…" opens its panel. */
  action?: boolean;
  /** Shown muted on the closed control, like the placeholder: a "Not set" choice. */
  quiet?: boolean;
  /**
   * A little colour mark before the label, in the menu and on the closed control: a dot
   * (a subscription's category) or a card's tile, with a CSS background.
   */
  swatch?: { background: string; shape?: "dot" | "card" };
}

function Swatch({ swatch }: { swatch: NonNullable<SelectOption["swatch"]> }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 ${swatch.shape === "card" ? "h-3.5 w-5 rounded-[4px] shadow-[inset_0_1px_0_oklch(1_0_0/0.2)]" : "size-2.5 rounded-[3px]"}`}
      style={{ background: swatch.background }}
    />
  );
}

/** Letters typed within this long of each other make one type-ahead search. */
const TYPEAHEAD_MS = 500;
/** How far Page Up and Page Down move: about one menu's height of options. */
const PAGE = 8;
/** The tallest a menu's list gets before it scrolls: about eight options. */
const LIST_MAX_HEIGHT = 296;
/** The menu card's padding and border, top and bottom, around its list. */
const MENU_FRAME = 14;

/**
 * The app's dropdown: a select-only combobox, as in the WAI-ARIA
 * Authoring Practices, drawn like the app's other floating cards (surface,
 * hairline border, --pop-shadow) instead of the browser's own menu.
 *
 * - Focus stays on the control the whole time, and aria-activedescendant
 *   points at the highlighted option, so focus never has to be put back.
 * - Keys: ↓ ↑ Enter or Space open it; then ↓ ↑ move, Home and End jump,
 *   Page Up and Down move by eight, typing finds an option by its first
 *   letters, Enter or Space picks, Alt+↑ picks, Esc and Tab close it.
 * - The menu is a manual popover, so it sits in the top layer: above the form
 *   dialogs, which are modal <dialog>s, and never clipped by their scrolling.
 *   It opens below the control, or above it when there's more room there.
 * - With `name`, a hidden input submits the value with its form.
 */
export function Select({
  id: givenId,
  options,
  value,
  onChange,
  onAction,
  onBlur,
  placeholder = "Choose",
  name,
  disabled,
  variant,
  className,
  icon,
  ref,
  ...aria
}: {
  id?: string;
  options: readonly SelectOption[];
  value: string;
  onChange?: (value: string) => void;
  onAction?: (option: SelectOption) => void;
  /** When focus leaves the control, as a form field's validation needs. */
  onBlur?: () => void;
  /** Shown while no option has the value. */
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  /** "field": the menu is as wide as the control. "pill": at least as wide, lined up with its right edge when the left has no room. */
  variant: "field" | "pill";
  /** The closed control's look, which belongs to the caller (the forms' inputClass, the period pill). */
  className: string;
  /** Shown before the value, like the period pill's calendar. */
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const listId = `${id}-listbox`;
  const optionId = (i: number) => `${id}-option-${i}`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  // Set when a key moves the highlight, so the list scrolls to it; the pointer moving it never scrolls.
  const reveal = useRef(false);
  const selected = options.findIndex((o) => o.value === value);
  const current = options[selected];
  // Nothing chosen, or a "Not set" choice, reads like the placeholder.
  const muted = !current || current.quiet;

  const setTrigger = (el: HTMLButtonElement | null) => {
    triggerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  function openAt(index: number) {
    if (disabled || options.length === 0) return;
    reveal.current = true;
    setActive(index);
    setOpen(true);
  }
  const openAtSelected = () => openAt(selected >= 0 && !options[selected].disabled ? selected : edgeIndex(options, "first"));

  function highlight(index: number) {
    if (index < 0) return;
    reveal.current = true;
    setActive(index);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    if (option.action) onAction?.(option);
    else if (option.value !== value) onChange?.(option.value);
  }

  function search(key: string, from: number): number {
    const now = Date.now();
    const text = now - typed.current.at > TYPEAHEAD_MS ? key : typed.current.text + key;
    typed.current = { text, at: now };
    return typeaheadIndex(options, from, text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const { key } = e;
    const printable = key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (!open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        e.preventDefault();
        openAtSelected();
      } else if (key === "Home" || key === "End") {
        e.preventDefault();
        openAt(edgeIndex(options, key === "Home" ? "first" : "last"));
      } else if (printable) {
        const hit = search(key, selected);
        if (hit >= 0) openAt(hit);
        else openAtSelected();
      }
      return;
    }
    switch (key) {
      case "ArrowDown":
        e.preventDefault();
        highlight(stepIndex(options, active, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) choose(active);
        else highlight(stepIndex(options, active, -1));
        break;
      case "Home":
      case "End":
        e.preventDefault();
        highlight(edgeIndex(options, key === "Home" ? "first" : "last"));
        break;
      case "PageDown":
      case "PageUp":
        e.preventDefault();
        highlight(stepIndex(options, active, key === "PageDown" ? PAGE : -PAGE));
        break;
      case "Enter":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        // Only the menu closes: inside a form dialog, the dialog stays open.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        // A space while typing is part of the search ("IDFC FIRST"); otherwise it picks.
        if (key === " " && Date.now() - typed.current.at > TYPEAHEAD_MS) {
          e.preventDefault();
          choose(active);
        } else if (printable) {
          e.preventDefault();
          highlight(search(key, active));
        }
    }
  }

  // Show the menu in the top layer and place it by its control, following it on scroll and resize.
  useLayoutEffect(() => {
    const pop = popRef.current;
    const list = listRef.current;
    const trigger = triggerRef.current;
    if (!open || !pop || !list || !trigger) return;
    // Strict Mode runs this twice, and Safari 17.0–17.3 throws on showing an open popover.
    if (typeof pop.showPopover === "function" && !pop.matches(":popover-open")) pop.showPopover();
    const place = () => {
      const t = trigger.getBoundingClientRect();
      if (variant === "field") pop.style.width = `${t.width}px`;
      else pop.style.minWidth = `${t.width}px`;
      list.style.maxHeight = `${LIST_MAX_HEIGHT}px`;
      const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
      const at = popoverPlacement(t, { width: pop.offsetWidth, height: pop.offsetHeight }, viewport, variant === "pill" ? "end" : "start");
      list.style.maxHeight = `${Math.max(0, Math.min(LIST_MAX_HEIGHT, at.maxHeight - MENU_FRAME))}px`;
      pop.style.top = `${at.top}px`;
      pop.style.left = `${at.left}px`;
      pop.dataset.side = at.side;
    };
    place();
    let frame = 0;
    const follow = (e: Event) => {
      if (e.target instanceof Node && pop.contains(e.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    // The control's own <label> counts as inside, so clicking it closes the menu (its click reaches the control) instead of reopening it.
    const inside = (node: Node) => pop.contains(node) || trigger.contains(node) || [...(trigger.labels ?? [])].some((label) => label.contains(node));
    const pressOutside = (e: PointerEvent) => {
      if (e.target instanceof Node && !inside(e.target)) setOpen(false);
    };
    // A close request on the form dialog around it (Esc, or a phone's back gesture) closes only the menu.
    const keepDialog = (e: Event) => {
      if (!(e.target instanceof Node) || !e.target.contains(trigger)) return;
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    document.addEventListener("pointerdown", pressOutside);
    document.addEventListener("cancel", keepDialog, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
      document.removeEventListener("pointerdown", pressOutside);
      document.removeEventListener("cancel", keepDialog, true);
    };
  }, [open, variant]);

  // Keep the highlighted option in view when a key moves it. The list scrolls itself, never the page.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list || !reveal.current) return;
    reveal.current = false;
    const option = document.getElementById(optionId(active));
    if (!option) return;
    const top = option.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top - 4;
    else if (top + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + option.offsetHeight - list.clientHeight + 4;
  });

  // Groups start at an option with a heading or a line above it.
  const sections: { heading?: string; divider: boolean; items: number[] }[] = [];
  options.forEach((option, i) => {
    if (i === 0 || option.group || option.divider) sections.push({ heading: option.group, divider: i > 0 && Boolean(option.divider), items: [] });
    sections[sections.length - 1].items.push(i);
  });
  const labelProps = aria["aria-labelledby"] ? { "aria-labelledby": aria["aria-labelledby"] } : { "aria-label": aria["aria-label"] };

  const renderOption = (i: number) => {
    const option = options[i];
    const isSelected = i === selected;
    return (
      <div
        key={`${i}-${option.value}`}
        id={optionId(i)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled || undefined}
        data-active={i === active ? "" : undefined}
        onPointerMove={() => {
          if (!option.disabled && i !== active) setActive(i);
        }}
        onClick={() => choose(i)}
        className={`group flex min-h-9 cursor-pointer items-center gap-3 rounded-[10px] pr-2.5 pl-3 select-none data-active:bg-fill aria-selected:bg-accent-tint aria-selected:text-accent-text aria-selected:data-active:inset-ring-[1.5px] aria-selected:data-active:inset-ring-accent/45 aria-disabled:cursor-default aria-disabled:opacity-55 max-md:min-h-11 pointer-coarse:min-h-11 ${
          variant === "field" ? "text-sm font-semibold" : "text-[13px] font-bold"
        }`}
      >
        {option.swatch && <Swatch swatch={option.swatch} />}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {option.meta && <span className="shrink-0 text-xs font-semibold text-muted tabular-nums group-aria-selected:text-accent-text">{option.meta}</span>}
        {option.action && !isSelected ? (
          <svg className="shrink-0 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        ) : (
          <svg className={`shrink-0 ${isSelected ? "" : "invisible"}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        role="combobox"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        disabled={disabled}
        {...aria}
        onClick={(e) => {
          // Safari doesn't focus a button it clicks; the keys and closing on blur need the focus here.
          e.currentTarget.focus();
          if (open) setOpen(false);
          else openAtSelected();
        }}
        onKeyDown={onKeyDown}
        // Space activates a button on key up, which would close the menu its key down just opened.
        onKeyUp={(e) => e.key === " " && e.preventDefault()}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        className={className}
      >
        {icon}
        {current?.swatch && <Swatch swatch={current.swatch} />}
        <span className={`min-w-0 flex-1 truncate text-left ${muted ? "font-medium text-muted" : ""}`}>{current ? (current.display ?? current.label) : placeholder}</span>
        <svg className={`shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-150 ${open ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {name !== undefined && <input type="hidden" name={name} value={value} disabled={disabled} />}
      {open && (
        <div
          ref={popRef}
          popover="manual"
          data-side="bottom"
          // Pressing on the menu keeps focus on the control.
          onMouseDown={(e) => e.preventDefault()}
          className="fixed inset-auto m-0 max-w-[calc(100vw-32px)] origin-top overflow-hidden rounded-[16px] border border-surface-line bg-surface p-1.5 text-fg shadow-pop data-[side=top]:origin-bottom data-[side=top]:[--pop-from:4px] motion-safe:animate-pop-in"
        >
          <div ref={listRef} role="listbox" id={listId} {...labelProps} className="overflow-y-auto overscroll-contain">
            {sections.map((section, k) => (
              <Fragment key={k}>
                {section.divider && <div role="presentation" className="mx-2 my-1.5 h-px bg-divider" />}
                {section.heading ? (
                  <div role="group" aria-labelledby={`${id}-group-${k}`}>
                    <div id={`${id}-group-${k}`} role="presentation" className="px-3 pt-2 pb-1 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">
                      {section.heading}
                    </div>
                    {section.items.map(renderOption)}
                  </div>
                ) : (
                  section.items.map(renderOption)
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
