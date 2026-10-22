import type { Bank, KnownBank } from "./types";

/** Ported from the proven keyword table in the reference cc_processor's parser.py. */
const BANK_KEYWORDS: Record<KnownBank, string[]> = {
  hdfc: ["HDFC Bank", "HDFC BANK", "HDFCBANK"],
  icici: ["ICICI Bank", "ICICI BANK"],
  axis: ["Axis Bank", "AXIS BANK"],
  sbi: ["SBI Card", "State Bank", "SBICARD"],
  kotak: ["Kotak Mahindra", "KOTAK"],
  amex: ["American Express", "AMEX"],
  csb: ["CSB Bank", "CSB BANK", "C S B", "jupiter.money", "jupit er .money"],
  yes: ["YES Bank", "YES BANK"],
};

function names(upperText: string, bank: KnownBank): boolean {
  return BANK_KEYWORDS[bank].some((keyword) => upperText.includes(keyword.toUpperCase()));
}

/** The first bank in the list above that the text names anywhere, so HDFC wins over a bank the text also names. */
export function detectBank(text: string): Bank {
  const upper = text.toUpperCase();
  return (Object.keys(BANK_KEYWORDS) as KnownBank[]).find((bank) => names(upper, bank)) ?? "unknown";
}

/** Whether the text names this bank anywhere, by the same keywords as detectBank, whatever other banks it names. */
export function mentionsBank(text: string, bank: KnownBank): boolean {
  return names(text.toUpperCase(), bank);
}
