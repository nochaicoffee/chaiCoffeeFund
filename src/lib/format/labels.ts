/**
 * A dropdown value as people read it. Multi-word values are stored hyphenated,
 * matching the Sheet's dropdowns ("HDFC-Bank", "Reward-Points"; see CLAUDE.md),
 * and shown with spaces ("HDFC Bank", "Reward Points").
 */
export function optionLabel(value: string): string {
  return value.replace(/-/g, " ");
}
