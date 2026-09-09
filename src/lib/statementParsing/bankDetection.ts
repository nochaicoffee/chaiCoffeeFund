import type { Bank } from "./types";

/** Ported from the proven keyword table in the reference cc_processor's parser.py. */
const BANK_KEYWORDS: Record<Exclude<Bank, "unknown">, string[]> = {
  hdfc: ["HDFC Bank", "HDFC BANK", "HDFCBANK"],
  icici: ["ICICI Bank", "ICICI BANK"],
  axis: ["Axis Bank", "AXIS BANK"],
  sbi: ["SBI Card", "State Bank", "SBICARD"],
  kotak: ["Kotak Mahindra", "KOTAK"],
  amex: ["American Express", "AMEX"],
  csb: ["CSB Bank", "CSB BANK", "C S B", "jupiter.money", "jupit er .money"],
  yes: ["YES Bank", "YES BANK"],
};

export function detectBank(text: string): Bank {
  const upper = text.toUpperCase();
  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS) as [Exclude<Bank, "unknown">, string[]][]) {
    if (keywords.some((keyword) => upper.includes(keyword.toUpperCase()))) {
      return bank;
    }
  }
  return "unknown";
}
