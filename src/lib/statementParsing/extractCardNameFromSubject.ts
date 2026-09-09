/**
 * Pulls a card name out of a statement email's subject line — ported from
 * the reference `extract_card_name_from_subject`.
 *
 * Examples:
 *   "Your 17 Dec 2025 - 16 Jan 2026 Edge CSB Bank RuPay Credit Card Statement"
 *     -> "Edge CSB Bank Credit Card"
 *   "Your HDFC Bank - Regalia Gold Credit Card Statement - January 2026"
 *     -> "HDFC Bank - Regalia Gold Credit Card"
 */
export function extractCardNameFromSubject(subject: string): string {
  const creditCardMatch = subject.match(/([A-Za-z][A-Za-z0-9\s_-]*?)\s*Credit Card/i);
  if (!creditCardMatch) return subject.trim();

  let cardName = creditCardMatch[1].trim();
  cardName = cardName.replace(/\d{1,2}\s+\w+\s+\d{4}\s*-?\s*/g, "");
  cardName = cardName.replace(/^[^\w]+/, "");
  cardName = cardName.replace(/_/g, " ");
  cardName = cardName.replace(/^(Your|your)\s+/, "");
  cardName = cardName.replace(/\s*RuPay\s*$/i, "");
  cardName = cardName.replace(/\s*-\s*$/, "");
  cardName = cardName.replace(/\s+/g, " ").trim();

  return cardName ? `${cardName} Credit Card` : "Credit Card";
}
