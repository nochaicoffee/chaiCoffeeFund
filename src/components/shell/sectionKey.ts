/**
 * A section's name as the key of its Neubrutalism colour, `--tag-bg-<key>` (ADR 0018 step 5b): "Lent out" → "lent-out".
 * Anything but letters and digits becomes one hyphen, so the key is always a valid custom property name. Shared by the
 * page header's tag and the navigation's icon chips.
 */
export function sectionKey(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The colour key for a navigation section: its page header's section name, which for Accounts is "Bank accounts". */
export function navColorKey(href: string, label: string): string {
  return href === "/accounts" ? "bank-accounts" : sectionKey(label);
}
