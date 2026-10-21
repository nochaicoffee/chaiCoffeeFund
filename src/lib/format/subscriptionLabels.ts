import { daysBetween } from "../aggregate/cardSpend";
import type { CardColor, RecurrenceCycle, SubscriptionCategory } from "../sheets/types";

/** The Subscriptions page's "All" pick. Subscription ids come from the Sheet as UUIDs, so this can't clash with one. */
export const ALL = "all";

/** A colour from the card palette, as its CSS token's key (`--card-<key>-from`). Emerald is All's. */
export type ColorKey = "emerald" | Lowercase<CardColor>;

/**
 * Each category's colour (#124). A subscription takes its category's, so it needs
 * no colour of its own; the design gives Food Music's teal and the rest of the
 * everyday ones onyx.
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

/** How far a date is from today, in words: "today", "tomorrow", "in 3 days", "in 2 months", "4 days ago". */
export function whenFrom(today: string, isoDate: string): string {
  const days = daysBetween(today, isoDate);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return days < 45 ? `in ${days} days` : `in ${Math.round(days / 30)} months`;
  return `${-days} days ago`;
}
