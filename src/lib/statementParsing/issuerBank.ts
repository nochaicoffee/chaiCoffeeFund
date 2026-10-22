import { optionLabel } from "@/lib/format/labels";
import type { Card, CardIssuer } from "@/lib/sheets/types";
import { detectBank, mentionsBank } from "./bankDetection";
import type { KnownBank } from "./types";

/**
 * The parser for each card issuer's statements, or null when there's none.
 * Every issuer is listed, so adding one to CARD_ISSUERS means deciding here.
 * A card whose issuer has no parser, "Other" included, has its statements
 * skipped, never read by the generic patterns (decided with Prathik,
 * 2026-10-19, #92).
 */
const ISSUER_BANKS: Record<CardIssuer, KnownBank | null> = {
  "HDFC-Bank": "hdfc",
  "ICICI-Bank": "icici",
  "Axis-Bank": "axis",
  "SBI-Card": "sbi",
  "Kotak-Mahindra-Bank": "kotak",
  "YES-Bank": "yes",
  "IDFC-FIRST-Bank": null,
  "IndusInd-Bank": null,
  "AU-Small-Finance-Bank": null,
  "RBL-Bank": null,
  "Federal-Bank": null,
  "CSB-Bank": "csb",
  HSBC: null,
  "Standard-Chartered": null,
  "American-Express": "amex",
  Other: null,
};

export function bankForIssuer(issuer: CardIssuer): KnownBank | null {
  return ISSUER_BANKS[issuer];
}

/** A bank as people read it: its issuer's name, "HDFC Bank" for hdfc. */
function bankLabel(bank: KnownBank): string {
  const issuer = (Object.keys(ISSUER_BANKS) as CardIssuer[]).find((i) => ISSUER_BANKS[i] === bank);
  return issuer ? optionLabel(issuer) : bank;
}

/**
 * Which parser reads a card's statement: the one for the card's issuer. The
 * PDF's text has to name that bank (by detectBank's keywords), or it's
 * probably another bank's, and it's skipped. A statement that also names
 * other banks, in an ad say, is still read as its card's bank's: detectBank
 * alone would pick whichever comes first in its list. Like
 * `toStatementFields`, a problem names banks and the card, never a value
 * from the PDF.
 */
export function checkStatementBank(card: Pick<Card, "name" | "issuer">, text: string): { bank: KnownBank } | { problem: string } {
  const bank = bankForIssuer(card.issuer);
  if (!bank) {
    return { problem: `the app can't read statements from ${card.name}'s issuer, ${optionLabel(card.issuer)}. If that's the wrong issuer, change it in the Cards tab` };
  }
  if (mentionsBank(text, bank)) return { bank };
  const found = detectBank(text);
  if (found === "unknown") {
    return { problem: `the PDF doesn't mention ${bankLabel(bank)}, ${card.name}'s issuer, so it's probably not its statement` };
  }
  return {
    problem: `the PDF looks like it's from ${bankLabel(found)} and doesn't mention ${bankLabel(bank)}, ${card.name}'s issuer, so it's probably another card's statement. If that's the wrong issuer, change it in the Cards tab`,
  };
}
