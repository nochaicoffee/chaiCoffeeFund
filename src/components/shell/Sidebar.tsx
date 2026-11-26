"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { icons } from "./icons";
import { trapTarget } from "./focusTrap";
import { LogoLockup, LogoMark } from "./Logo";
import { LookSwitch } from "./LookSwitch";
import { isActiveSection, SECTIONS, SIDEBAR_COOKIE, splitForPhone, type Section } from "./sections";
import type { Look } from "@/lib/sheets/types";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
/** Matches Tailwind's `md` breakpoint, where the rail replaces the phone menu. */
const DESKTOP_QUERY = "(min-width: 48rem)";

const { tabs: PHONE_TABS, more: PHONE_MORE } = splitForPhone(SECTIONS);

/** A bar button's shape: an icon pill over a 13 px label, 46 px tall (--phone-nav-h in globals.css adds up from this). */
const PHONE_BUTTON = "flex min-h-[46px] flex-1 flex-col items-center gap-[3px] text-[10.5px] leading-[13px] font-extrabold";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function SectionLink({
  section,
  pathname,
  variant,
  onNavigate,
}: {
  section: Section;
  pathname: string;
  variant: "rail" | "rail-expanded";
  onNavigate?: () => void;
}) {
  const active = isActiveSection(section.href, pathname);
  const shape = {
    rail: "h-[38px] w-[38px] justify-center",
    "rail-expanded": "h-[38px] gap-3 px-[11px] text-sm font-semibold",
  }[variant];
  const idle = "text-muted hover:bg-fill hover:text-fg";
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

/** One of the phone bar's tabs: an icon in a pill (inked when it is the page you are on) over its name. */
/** `inSheetTrap`: the sheet is open, so Tab skips the tabs (they stay tappable) and cycles through the sheet and More. */
function PhoneTab({ section, active, inSheetTrap }: { section: Section; active: boolean; inSheetTrap: boolean }) {
  return (
    <Link
      href={section.href}
      aria-current={active ? "page" : undefined}
      tabIndex={inSheetTrap ? -1 : undefined}
      className={`${PHONE_BUTTON} ${active ? "text-fg" : "text-muted"} ${FOCUS_RING}`}
    >
      <PhonePill active={active}>{icons[section.icon]}</PhonePill>
      {section.label}
    </Link>
  );
}

function PhonePill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`flex h-[30px] w-[52px] items-center justify-center rounded-full [&_svg]:size-5 ${active ? "bg-ink text-on-ink" : ""}`}>{children}</span>;
}

/**
 * Desktop: the design's pill-shaped icon rail, which expands to show labels.
 * The choice is kept in a cookie so the server renders it the same way next time.
 * Phone: a slim top bar with the logo, and a bottom bar with four tabs (PHONE_TAB_HREFS) and a More button
 * that lifts a sheet with every other section (docs/design/phone-nav-logo.md, option 1).
 */
export function Sidebar({
  initiallyExpanded,
  appName,
  ownerName,
  showSignOut,
  look,
}: {
  initiallyExpanded: boolean;
  appName: string;
  ownerName: string;
  /** Whether the app is behind a login. Without one (local development) there is nothing to sign out of. */
  showSignOut: boolean;
  /** The look the page is drawn in (ADR 0018), for the switch. */
  look: Look;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  // The sheet is open for the page it was opened on, so going to another page (a tab, a tile) closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const menuOpen = openAt === pathname;
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    const trigger = menuButtonRef.current;
    // The bar stays visible under the sheet and its More button is how you close it, so the trap includes it.
    const focusables = () => [...(menu?.querySelectorAll<HTMLElement>("a[href], button") ?? []), ...(trigger ? [trigger] : [])];
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenAt(null);
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab inside the sheet while it's open.
      const items = focusables();
      const target = trapTarget(items.indexOf(document.activeElement as HTMLElement), items.length, e.shiftKey);
      if (target !== null) {
        e.preventDefault();
        items[target]?.focus();
      }
    };
    // The sheet only exists on phone; close it if the window grows to desktop width.
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onWiden = () => desktop.matches && setOpenAt(null);
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

  const closeMenu = () => setOpenAt(null);
  const initial = (ownerName || appName).charAt(0).toUpperCase();
  // The More button wears the ink pill while its sheet is open, and when the page you are on is behind it.
  const moreActive = menuOpen || PHONE_MORE.some((section) => isActiveSection(section.href, pathname));

  return (
    <>
      <nav
        aria-label={`${appName} sections`}
        className={`sticky top-6 hidden h-[calc(100dvh-3rem)] shrink-0 flex-col gap-2.5 surface-edge bg-surface py-[18px] shadow-soft md:flex ${
          expanded ? "w-[212px] rounded-[28px] px-3" : "w-16 items-center rounded-full"
        }`}
      >
        <Link
          href="/"
          aria-label={expanded ? undefined : appName}
          title={expanded ? undefined : appName}
          className={`mb-1 flex shrink-0 items-center rounded-full ${FOCUS_RING} ${expanded ? "px-[11px]" : "justify-center"}`}
        >
          {expanded ? <LogoLockup appName={appName} size={26} /> : <LogoMark size={30} />}
        </Link>
        {SECTIONS.map((section) => (
          <SectionLink
            key={section.href}
            section={section}
            pathname={pathname}
            variant={expanded ? "rail-expanded" : "rail"}
          />
        ))}

        <div className="mt-auto flex flex-col gap-3">
        {expanded && <LookSwitch look={look} variant="rail-expanded" />}
        <div className={`flex gap-3 ${expanded ? "items-center justify-between px-1" : "flex-col items-center"}`}>
          {!expanded && <LookSwitch look={look} variant="rail" />}
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className={`flex size-[30px] items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg ${FOCUS_RING}`}
          >
            {expanded ? icons.collapse : icons.expand}
          </button>
          {showSignOut && (
            // A POST, so a link on another site can't sign him out (app/logout/route.ts).
            <form method="post" action="/logout" className="flex">
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className={`flex size-[30px] items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg ${FOCUS_RING}`}
              >
                {icons.signOut}
              </button>
            </form>
          )}
          <div
            className="flex size-[30px] items-center justify-center rounded-full bg-ink text-xs font-extrabold text-on-ink"
            title={ownerName || appName}
            aria-hidden="true"
          >
            {initial}
          </div>
        </div>
        </div>
      </nav>

      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex min-h-14 items-center justify-between rule-b bg-page py-1.5 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:hidden">
        <Link href="/" className={`rounded-full ${FOCUS_RING}`}>
          <LogoLockup appName={appName} size={26} />
        </Link>
        <div className="flex size-[34px] items-center justify-center rounded-full bg-ink text-[13px] font-extrabold text-on-ink" aria-hidden="true">
          {initial}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[29] md:hidden">
          <div aria-hidden="true" onClick={closeMenu} className="absolute inset-0 bg-ink/40" />
          <div
            ref={menuRef}
            id="phone-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-surface pt-2.5 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(var(--phone-nav-h)+0.75rem)] pl-[max(1rem,env(safe-area-inset-left))] shadow-card"
          >
            <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-[38px] rounded-full bg-fill-strong" />
            <h2 className="mb-3 text-[17px] font-extrabold">More</h2>
            <nav aria-label={`More ${appName} sections`} className="grid grid-cols-3 gap-2.5">
              {PHONE_MORE.map((section) => {
                const active = isActiveSection(section.href, pathname);
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-w-0 flex-col items-center gap-[7px] rounded-[20px] px-1 pt-3 pb-2.5 text-center text-xs leading-tight font-extrabold [overflow-wrap:anywhere] ${active ? "bg-ink text-on-ink" : "bg-page text-fg"} ${FOCUS_RING}`}
                  >
                    <span className={`flex size-[38px] items-center justify-center rounded-full ${active ? "bg-on-ink/15" : "bg-surface shadow-soft"}`}>{icons[section.icon]}</span>
                    {section.label}
                  </Link>
                );
              })}
            </nav>
            <LookSwitch look={look} variant="sheet" />
            {showSignOut && (
              <form method="post" action="/logout" className="mt-3">
                <button
                  type="submit"
                  className={`flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-[13.5px] font-bold text-muted hover:bg-fill hover:text-fg ${FOCUS_RING}`}
                >
                  {icons.signOut}
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label={`${appName} sections`}
        className="fixed inset-x-0 bottom-0 z-30 flex rule-t bg-surface pt-2 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] md:hidden"
      >
        {PHONE_TABS.map((section) => (
          <PhoneTab key={section.href} section={section} active={isActiveSection(section.href, pathname)} inSheetTrap={menuOpen} />
        ))}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpenAt(menuOpen ? null : pathname)}
          aria-expanded={menuOpen}
          aria-controls="phone-menu"
          className={`${PHONE_BUTTON} ${moreActive ? "text-fg" : "text-muted"} ${FOCUS_RING}`}
        >
          <PhonePill active={moreActive}>{menuOpen ? icons.close : icons.more}</PhonePill>
          {menuOpen ? "Close" : "More"}
        </button>
      </nav>
    </>
  );
}
