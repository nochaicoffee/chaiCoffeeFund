/**
 * A dropdown value as people read it. Multi-word values are stored hyphenated,
 * matching the Sheet's dropdowns ("HDFC-Bank", "Reward-Points"; see CLAUDE.md),
 * and shown with spaces ("HDFC Bank", "Reward Points").
 */
export function optionLabel(value: string): string {
  return value.replace(/-/g, " ");
}

/** What the app calls a card: its short name, or its full name when it has none (the Add card form's "Shown on the tile"). */
export function cardName(card: { name: string; alias?: string }): string {
  return card.alias?.trim() || card.name;
}

/** A day of the month as people say it: 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(day: number): string {
  const tens = day % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix}`;
}

/** Utilization as the details card shows it: "32%", "4.2%" under 10%, "–" with no limit. */
export function formatPercent(value: number | null): string {
  return value === null ? "–" : `${(value * 100).toFixed(value * 100 >= 10 ? 0 : 1).replace(/\.0$/, "")}%`;
}
