import type { Card } from "@/lib/sheets/types";

export type MatchCardResult = { card: Card } | { ambiguous: Card[] } | { noMatch: true };

/** Lowercases, collapses whitespace, and strips "credit card"/"bank" noise words — ported from `normalizeForMatch`. */
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/credit card/gi, "")
    .replace(/bank/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bidirectionalContains(a: string, b: string): boolean {
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
}

/**
 * Matches a card name extracted from a statement email against every known
 * `Card` — bidirectional-contains on name/alias, then a comma-separated
 * `emailMatchKeywords` fallback. Ported from `Utils.gs`'s `matchCardName`,
 * but deliberately different in one way: the original returns as soon as it
 * finds *any* match, silently picking whichever card happened to come
 * first. Here every card is scanned, and more than one match is reported as
 * ambiguous rather than guessed — a silent wrong-card write is worse than a
 * skipped statement in a personal-finance app.
 */
export function matchCard(extractedName: string, cards: Card[]): MatchCardResult {
  const normalizedExtracted = normalizeForMatch(extractedName);

  const nameOrAliasMatches = cards.filter((card) => {
    const normalizedName = normalizeForMatch(card.name);
    const normalizedAlias = card.alias ? normalizeForMatch(card.alias) : "";
    return (
      bidirectionalContains(normalizedName, normalizedExtracted) ||
      (normalizedAlias !== "" && bidirectionalContains(normalizedAlias, normalizedExtracted))
    );
  });
  if (nameOrAliasMatches.length === 1) return { card: nameOrAliasMatches[0] };
  if (nameOrAliasMatches.length > 1) return { ambiguous: nameOrAliasMatches };

  const lowerExtracted = extractedName.toLowerCase();
  const keywordMatches = cards.filter((card) => {
    if (!card.emailMatchKeywords) return false;
    const keywords = card.emailMatchKeywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    return keywords.some((keyword) => lowerExtracted.includes(keyword));
  });
  if (keywordMatches.length === 1) return { card: keywordMatches[0] };
  if (keywordMatches.length > 1) return { ambiguous: keywordMatches };

  return { noMatch: true };
}
