import type { Card } from "../sheets/types";

/**
 * Reading a card's last 4 digits from its statement PDF (#78). Statements print
 * the card number masked, in many shapes: "4386 24XX XXXX 1234",
 * "XXXX XXXX XXXX 1234", "XXXXXXXXXXXX1234", "**** **** **** 1234", or Amex's
 * "XXXX XXXXXX X1004". pdf.js joins text pieces with spaces, so a number can
 * arrive split into odd groups ("43 86 24XX…").
 */

const MASK = /[Xx*•]/g;
/** Runs of digit/mask groups separated by single spaces or hyphens. */
const RUN = /[0-9Xx*•]+(?:[ -][0-9Xx*•]+)*/g;
/**
 * "Credit Card ending 1234", "Card No. ending with XX1234", "card number ending
 * in 1234". "ending" has to follow "card" (or "card no." / "card number")
 * directly, so "card statement for the period ending 2026-10-12" isn't read as
 * a last 4 of 2026.
 */
const ENDING = /\bcard\s*(?:no\.?|number)?\s*ending\s*(?:in|with)?\s*[:-]?\s*(?:[Xx*•]+[\s-]*)*(\d{4})\b/gi;

/**
 * Every last 4 printed as part of a masked card number, without repeats, in the
 * order found. A candidate is a 15- or 16-character card number with at least
 * four masked characters that ends in 4 digits, so an unmasked reference number,
 * a phone number or an amount doesn't count.
 */
export function findCardLast4s(text: string): string[] {
  const found = new Set<string>();
  for (const run of text.match(RUN) ?? []) {
    const groups = run.split(/[ -]/);
    for (let start = 0; start < groups.length; start++) {
      let number = "";
      for (let end = start; end < groups.length && number.length < 16; end++) {
        number += groups[end];
        const isCardNumber = (number.length === 15 || number.length === 16) && /\d{4}$/.test(number) && (number.match(MASK)?.length ?? 0) >= 4;
        if (isCardNumber) found.add(number.slice(-4));
      }
    }
  }
  for (const match of text.matchAll(ENDING)) found.add(match[1]);
  return [...found];
}

export type Last4Check =
  /** The card has no last 4 and the statement shows exactly one: save it on the card. */
  | { kind: "fill"; last4: string }
  /** The statement agrees with the card's last 4, or there's nothing to compare. */
  | { kind: "ok" }
  /** The statement shows only other numbers: probably a statement for a different card. */
  | { kind: "mismatch"; found: string[] };

/**
 * Compares a matched card's last 4 with what its statement shows. An add-on
 * card can put a second number on the statement, so the card's own last 4 only
 * has to be one of those found. A card with no last 4 is only filled in when
 * the statement shows exactly one number.
 */
export function checkCardLast4(card: Pick<Card, "last4">, found: string[]): Last4Check {
  if (found.length === 0) return { kind: "ok" };
  if (card.last4) return found.includes(card.last4) ? { kind: "ok" } : { kind: "mismatch", found };
  return found.length === 1 ? { kind: "fill", last4: found[0] } : { kind: "ok" };
}
