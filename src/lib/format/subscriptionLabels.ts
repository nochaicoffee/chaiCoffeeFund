import { formatInr } from "./money";
import { daysBetween } from "../aggregate/cardSpend";
import type { CardColor, RecurrenceCycle, Subscription, SubscriptionCategory, SubscriptionColor } from "../sheets/types";

/** The Subscriptions page's "All" pick. Subscription ids come from the Sheet as UUIDs, so this can't clash with one. */
export const ALL = "all";

/** A colour as its CSS token's key (`--card-<key>-from`): the card palette, All's emerald, and the subscription colours. */
export type ColorKey = "emerald" | Lowercase<CardColor> | Lowercase<SubscriptionColor>;

/**
 * Each category's colour (#124), for the cost map's By category view and the Category
 * menu. A subscription's own colour is picked in Add and Edit (#137); this is only its
 * fallback for a row saved before colours could be picked. The design gives Food Music's
 * teal and the rest of the everyday ones onyx.
 */
const CATEGORY_COLORS: Record<SubscriptionCategory, ColorKey> = {
  Streaming: "ruby",
  Music: "teal",
  Software: "sapphire",
  "Cloud-Storage": "violet",
  Fitness: "copper",
  Food: "teal",
  Shopping: "onyx",
  News: "onyx",
  Utilities: "slate",
  Other: "onyx",
};

export function categoryColor(category: SubscriptionCategory): ColorKey {
  return CATEGORY_COLORS[category] ?? "onyx";
}

/** "Cloud-Storage" → "Cloud storage": the Sheet's spelling, as the page shows it. */
export function categoryLabel(category: string): string {
  const words = category.split("-");
  return [words[0], ...words.slice(1).map((w) => w.toLowerCase())].join(" ");
}

/** "month", "quarter" or "year": what one payment covers. */
export function cycleWord(cycle: RecurrenceCycle): string {
  return { Monthly: "month", Quarterly: "quarter", Yearly: "year" }[cycle];
}

/** The 155° gradient a tile in this colour is drawn with. */
export function colorGradient(color: ColorKey, angle = 155): string {
  return `linear-gradient(${angle}deg, var(--card-${color}-from), var(--card-${color}-to))`;
}

/** A card's colour as a palette key; Onyx when it has none. */
export function cardColorKey(color: CardColor | undefined): ColorKey {
  return (color ?? "Onyx").toLowerCase() as ColorKey;
}

/** A block's or a category's share of the monthly total, as the map's hover cards say it: "31% of your ₹1,865 a month", or "Under 1%" for a sliver. */
export function shareOfTotal(monthly: number, total: number): string {
  const percent = total > 0 ? (monthly / total) * 100 : 0;
  return `${percent > 0 && percent < 1 ? "Under 1" : Math.round(percent)}% of your ${formatInr(total)} a month`;
}

/** How far a date is from today, in words: "today", "tomorrow", "in 3 days", "in 2 months", "4 days ago". */
export function whenFrom(today: string, isoDate: string): string {
  const days = daysBetween(today, isoDate);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return days < 45 ? `in ${days} days` : `in ${Math.round(days / 30)} months`;
  return `${-days} days ago`;
}

/** How a subscription is marked in a list or chart: its alias, initial and its colour, greyed when it isn't active. */
export interface Mark {
  alias: string;
  initial: string;
  color: ColorKey;
  /** Paused or cancelled: drawn greyed. */
  muted: boolean;
}

/** A subscription's colour: the one chosen for it, or (for a row from before colours were chosen) its category's. */
export function subscriptionColor(s: Pick<Subscription, "color" | "category">): ColorKey {
  return s.color ? (s.color.toLowerCase() as ColorKey) : categoryColor(s.category);
}

/** The colour as the Sheet's dropdown names it: "Ruby". */
export function colorName(key: ColorKey): SubscriptionColor {
  return (key[0].toUpperCase() + key.slice(1)) as SubscriptionColor;
}

export function subscriptionMark(s: Pick<Subscription, "alias" | "category" | "status" | "color">): Mark {
  return { alias: s.alias, initial: (s.alias.trim()[0] ?? "?").toUpperCase(), color: subscriptionColor(s), muted: s.status !== "Active" };
}
