import type { icons } from "./icons";

/** Cookie holding the desktop sidebar state ("expanded" or "collapsed"), read by the root layout to render it without a flash. */
export const SIDEBAR_COOKIE = "sidebar";

export interface Section {
  href: string;
  label: string;
  icon: keyof typeof icons;
  /** The PRD milestone that builds this section, shown until it exists. */
  comingIn?: string;
}

/** Every section from the PRD, in sidebar order. */
export const SECTIONS: Section[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/cards", label: "Cards", icon: "cards" },
  { href: "/subscriptions", label: "Subscriptions", icon: "subscriptions", comingIn: "M3 · Everyday money" },
  { href: "/income", label: "Income", icon: "income", comingIn: "M3 · Everyday money" },
  { href: "/loans", label: "Loans", icon: "loans", comingIn: "M3 · Everyday money" },
  { href: "/fixed-income", label: "Fixed Income", icon: "fixedIncome", comingIn: "M4 · Wealth" },
  { href: "/investments", label: "Investments", icon: "investments", comingIn: "M4 · Wealth" },
];

/** True when `pathname` is this section's page or one of its sub-pages (/cards/statements is Cards). */
export function isActiveSection(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionByHref(href: string): Section {
  const section = SECTIONS.find((s) => s.href === href);
  if (!section) throw new Error(`Unknown section: ${href}`);
  return section;
}
