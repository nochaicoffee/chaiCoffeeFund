"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { icons } from "./icons";
import { isActiveSection, SECTIONS, SIDEBAR_COOKIE, type Section } from "./sections";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
/** Matches Tailwind's `md` breakpoint, where the rail replaces the phone menu. */
const DESKTOP_QUERY = "(min-width: 48rem)";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function SectionLink({
  section,
  pathname,
  variant,
  onNavigate,
}: {
  section: Section;
  pathname: string;
  variant: "rail" | "rail-expanded" | "menu";
  onNavigate?: () => void;
}) {
  const active = isActiveSection(section.href, pathname);
  const shape = {
    rail: "h-[38px] w-[38px] justify-center",
    "rail-expanded": "h-[38px] gap-3 px-[11px] text-sm font-semibold",
    menu: "min-h-11 gap-3 px-4 text-[15px] font-semibold",
  }[variant];
  const idle = variant === "menu" ? "text-fg hover:bg-fill" : "text-muted hover:bg-fill hover:text-fg";
  const iconOnly = variant === "rail";
  return (
    <Link
      href={section.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={iconOnly ? section.label : undefined}
      title={iconOnly ? section.label : undefined}
      className={`flex shrink-0 items-center rounded-full transition-colors ${FOCUS_RING} ${shape} ${active ? "bg-ink text-on-ink" : idle}`}
    >
      {icons[section.icon]}
      {!iconOnly && <span className="truncate">{section.label}</span>}
    </Link>
  );
}

/**
 * Desktop: the design's pill-shaped icon rail, which expands to show labels.
 * The choice is kept in a cookie so the server renders it the same way next time.
 * Phone: a top bar whose menu button opens the sections as a modal sheet.
 */
export function Sidebar({
  initiallyExpanded,
  appName,
  ownerName,
}: {
  initiallyExpanded: boolean;
  appName: string;
  ownerName: string;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    const trigger = menuButtonRef.current;
    const focusables = () => [...(menu?.querySelectorAll<HTMLElement>("a[href], button") ?? [])];
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab inside the sheet while it's open.
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    // The sheet only exists on phone; close it if the window grows to desktop width.
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onWiden = () => desktop.matches && setMenuOpen(false);
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onWiden);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onWiden);
      trigger?.focus();
    };
  }, [menuOpen]);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "expanded" : "collapsed"}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  }

  const closeMenu = () => setMenuOpen(false);
  const initial = ownerName.charAt(0).toUpperCase();

  return (
    <>
      <nav
        aria-label={`${appName} sections`}
        className={`sticky top-6 hidden h-[calc(100dvh-3rem)] shrink-0 flex-col gap-2.5 border border-surface-line bg-surface py-[18px] shadow-soft md:flex ${
          expanded ? "w-[212px] rounded-[28px] px-3" : "w-16 items-center rounded-full"
        }`}
      >
        {expanded && <div className="mb-1 px-[11px] text-base font-extrabold text-fg">{appName}</div>}
        {SECTIONS.map((section) => (
          <SectionLink
            key={section.href}
            section={section}
            pathname={pathname}
            variant={expanded ? "rail-expanded" : "rail"}
          />
        ))}

        <div className={`mt-auto flex gap-3 ${expanded ? "items-center justify-between px-1" : "flex-col items-center"}`}>
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className={`flex size-[30px] items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg ${FOCUS_RING}`}
          >
            {expanded ? icons.collapse : icons.expand}
          </button>
          <div
            className="flex size-[30px] items-center justify-center rounded-full bg-ink text-xs font-extrabold text-on-ink"
            title={ownerName}
            aria-hidden="true"
          >
            {initial}
          </div>
        </div>
      </nav>

      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex items-center justify-between border-b border-divider bg-page py-2 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:hidden">
        <span className="text-base font-extrabold">{appName}</span>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="phone-menu"
          className={`flex size-11 items-center justify-center rounded-full text-fg hover:bg-fill ${FOCUS_RING}`}
        >
          {icons.menu}
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div aria-hidden="true" onClick={closeMenu} className="absolute inset-0 bg-ink/40" />
          <div
            ref={menuRef}
            id="phone-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col gap-1 overflow-y-auto bg-surface pt-[max(1rem,env(safe-area-inset-top))] pr-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] shadow-card"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-extrabold">{appName}</span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className={`flex size-11 items-center justify-center rounded-full text-fg hover:bg-fill ${FOCUS_RING}`}
              >
                {icons.close}
              </button>
            </div>
            <nav aria-label={`${appName} sections`} className="flex flex-col gap-1">
              {SECTIONS.map((section) => (
                <SectionLink
                  key={section.href}
                  section={section}
                  pathname={pathname}
                  variant="menu"
                  onNavigate={closeMenu}
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
