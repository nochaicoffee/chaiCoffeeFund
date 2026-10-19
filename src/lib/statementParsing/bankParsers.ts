import { cleanAmount } from "./normalize";
import type { KnownBank, ParsedStatementDetails } from "./types";

/** Returns the first regex in `patterns` that matches `text`, or null. */
function firstMatch(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

// =============================================================================
// Bank-specific parsers — ported near-verbatim from the reference cc_processor's
// parser.py, which is proven against real statements. Keep the regex
// equivalent to the Python so future debugging against that reference stays
// possible; only the string-vs-typed-value boundary differs (see toStatementFields.ts).
// =============================================================================

export function parseHdfc(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "hdfc" };

  const tabular = text.match(
    /Payment Due Date\s+Total Dues\s+Minimum Amount Due\s*\n\s*(\d{2}[/-]\d{2}[/-]\d{2,4})\s+(-?[\d,]+\.?\d*)\s+(-?[\d,]+\.?\d*)/i,
  );
  if (tabular) {
    details.dueDate = tabular[1];
    details.totalAmountDue = cleanAmount(tabular[2]);
    details.minimumAmountDue = cleanAmount(tabular[3]);
  }

  // The "C" is HDFC's rupee glyph. pdf.js reads it as a text piece of its own,
  // so the extracted text has a space after it: "TOTAL AMOUNT DUE  C 5,000.00" (#56).
  if (!details.totalAmountDue) {
    const total = text.match(/TOTAL AMOUNT DUE\s*[C₹]?\s*(-?[\d,]+\.?\d*)/i);
    if (total) details.totalAmountDue = cleanAmount(total[1]);
  }

  if (!details.minimumAmountDue) {
    const min = text.match(/MINIMUM DUE\s*[C₹]?\s*(-?[\d,]+\.?\d*)/i);
    if (min) details.minimumAmountDue = cleanAmount(min[1]);
  }

  if (!details.dueDate) {
    const due = text.match(/DUE DATE\s*\n?\s*(\d{1,2}\s+\w+,?\s+\d{4})/i);
    if (due) {
      details.dueDate = due[1];
    } else if (text.match(/DUE DATE\s*\n?\s*(Nil|N\/A|NA|-)/i)) {
      details.noDueDate = "nothing owed";
    }
  }

  if (!details.totalAmountDue) {
    const match = firstMatch(text, [
      /Total Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Amount Payable[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Total\s+Dues[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Outstanding[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    ]);
    if (match) details.totalAmountDue = cleanAmount(match[1]);
  }

  if (!details.minimumAmountDue) {
    const match = firstMatch(text, [
      /Minimum Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Min\.?\s*Amount\s*Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /MAD[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    ]);
    if (match) details.minimumAmountDue = cleanAmount(match[1]);
  }

  // Not when the PDF says there's no due date: these would find a date elsewhere.
  if (!details.dueDate && !details.noDueDate) {
    const match = firstMatch(text, [
      /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Pay by[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Due[:\s]*(\d{2}\s+\w+\s+\d{4})/i,
    ]);
    if (match) details.dueDate = match[1];
  }

  if (!details.statementDate) {
    const asOn = text.match(/As on\s*:\s*(\d{1,2}\s+\w+,?\s+\d{4})/i);
    if (asOn) details.statementDate = asOn[1];
  }

  if (!details.statementDate) {
    const match = firstMatch(text, [
      /Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Statement Period[:\s]*.*?to\s*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Billing Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Generated on[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    ]);
    if (match) details.statementDate = match[1];
  }

  return details;
}

export function parseIcici(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "icici" };

  // ICICI prints rupee amounts with a special glyph: the first is the Minimum, the second the Total.
  // The reference parser's text extraction read it as "Á"; pdf.js reads it as a backtick, mostly
  // followed by a space ("` 170.00  ` 3,250.81"). Without this, the amounts came from the generic
  // fallback instead, which found a worked example of the minimum due on a later page (#56).
  const iciciAmounts = [...text.matchAll(/(?:Á|`\s*)(\d[\d,]*\.?\d*)/g)].map((m) => m[1]);
  if (iciciAmounts.length >= 2) {
    details.minimumAmountDue = cleanAmount(iciciAmounts[0]);
    details.totalAmountDue = cleanAmount(iciciAmounts[1]);
  }

  const wordDates = [...text.matchAll(/(\w+\s+\d{1,2},?\s+\d{4})/g)].map((m) => m[1]);
  if (wordDates.length >= 2) {
    details.statementDate = wordDates[0];
    details.dueDate = wordDates[1];
  }

  const period = text.match(/Statement period\s*:\s*(\w+\s+\d{1,2},?\s+\d{4})\s+to\s+(\w+\s+\d{1,2},?\s+\d{4})/i);
  if (period) details.statementDate = period[2];

  if (!details.totalAmountDue) {
    const match = firstMatch(text, [
      /Total Amount due\s*(?:Á|₹|Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Total Amount Due[:\s]*(?:Á|₹|Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Total\s+Dues[:\s]*(?:Á|₹|Rs\.?\s*)?([\d,]+\.?\d*)/i,
    ]);
    if (match) details.totalAmountDue = cleanAmount(match[1]);
  }

  if (!details.minimumAmountDue) {
    const match = firstMatch(text, [
      /Minimum Amount due\s*(?:Á|₹|Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Minimum Amount Due[:\s]*(?:Á|₹|Rs\.?\s*)?([\d,]+\.?\d*)/i,
    ]);
    if (match) details.minimumAmountDue = cleanAmount(match[1]);
  }

  if (!details.dueDate) {
    const match = firstMatch(text, [
      /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    ]);
    if (match) details.dueDate = match[1];
  }

  if (!details.statementDate) {
    const match = text.match(/Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i);
    if (match) details.statementDate = match[1];
  }

  return details;
}

export function parseAxis(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "axis" };

  // The payment summary as pdf.js extracts it: statement period, due date and
  // generation date, then "<total> Dr <minimum> Dr" (#56).
  const summary = text.match(
    /(\d{2}[/-]\d{2}[/-]\d{4})\s*-\s*(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+([\d,]+\.\d{2})\s*Dr\s+([\d,]+\.\d{2})\s*Dr/,
  );
  if (summary) {
    details.dueDate = summary[3];
    details.statementDate = summary[4];
    details.totalAmountDue = cleanAmount(summary[5]);
    details.minimumAmountDue = cleanAmount(summary[6]);
  }

  if (!summary) {
    const tabularDates = text.match(
      /(\d{2}[/-]\d{2}[/-]\d{4})\s*-\s*(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})\s+(\d{2}[/-]\d{2}[/-]\d{4})/,
    );
    if (tabularDates) {
      details.dueDate = tabularDates[3];
      details.statementDate = tabularDates[4];
    }
  }

  if (!details.totalAmountDue) {
    const totalLine = text.match(/=\s*Total Payment Due\s*\n\s*.*?([\d,]+\.?\d*)\s*Dr\s*$/m);
    if (totalLine) details.totalAmountDue = cleanAmount(totalLine[1]);
  }

  if (!details.minimumAmountDue) {
    const min = text.match(/Dr\s+([\d,]+\.?\d*)\s*Dr/);
    if (min) details.minimumAmountDue = cleanAmount(min[1]);
  }

  if (!details.totalAmountDue) {
    const match = firstMatch(text, [
      // Not "...+ Other Debit&Charges =Total Payment Due": the account summary's
      // equation, where the number that follows is the previous balance (#56).
      /(?<!=\s*)Total Payment Due[:\s]*([\d,]+\.?\d*)/i,
      /Total Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Current Balance[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    ]);
    if (match) details.totalAmountDue = cleanAmount(match[1]);
  }

  if (!details.minimumAmountDue) {
    const match = firstMatch(text, [
      /Minimum Payment Due[:\s]*([\d,]+\.?\d*)/i,
      /Minimum Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
      /Min Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    ]);
    if (match) details.minimumAmountDue = cleanAmount(match[1]);
  }

  if (!details.dueDate) {
    const match = firstMatch(text, [
      /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    ]);
    if (match) details.dueDate = match[1];
  }

  if (!details.statementDate) {
    const match = firstMatch(text, [
      /Statement Generation Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
      /Statement Period[:\s]*\d{2}[/-]\d{2}[/-]\d{2,4}\s*(?:to|-)\s*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    ]);
    if (match) details.statementDate = match[1];
  }

  return details;
}

export function parseSbi(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "sbi" };

  const total = firstMatch(text, [
    /Total Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Total Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
  ]);
  if (total) details.totalAmountDue = cleanAmount(total[1]);

  const min = text.match(/Minimum Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i);
  if (min) details.minimumAmountDue = cleanAmount(min[1]);

  const due = firstMatch(text, [
    /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ]);
  if (due) details.dueDate = due[1];

  const stmt = text.match(/Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i);
  if (stmt) details.statementDate = stmt[1];

  return details;
}

export function parseYes(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "yes" };

  const total = text.match(/Total Amount Due[:\s]*\n?\s*Rs\.?\s*([\d,]+\.?\d*)/i);
  if (total) details.totalAmountDue = cleanAmount(total[1]);

  const min = text.match(/Minimum Amount Due[:\s]*\n?\s*Rs\.?\s*([\d,]+\.?\d*)/i);
  if (min) details.minimumAmountDue = cleanAmount(min[1]);

  const due = text.match(/Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{4})/i);
  if (due) details.dueDate = due[1];

  const stmt = text.match(/Statement Date\s*[:\s]*(\d{2}[/-]\d{2}[/-]\d{4})/i);
  if (stmt) details.statementDate = stmt[1];

  return details;
}

export function parseKotak(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "kotak" };

  const total = firstMatch(text, [
    /Total Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Total Dues[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
  ]);
  if (total) details.totalAmountDue = cleanAmount(total[1]);

  const min = text.match(/Minimum Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i);
  if (min) details.minimumAmountDue = cleanAmount(min[1]);

  const due = firstMatch(text, [
    /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ]);
  if (due) details.dueDate = due[1];

  const stmt = text.match(/Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i);
  if (stmt) details.statementDate = stmt[1];

  return details;
}

export function parseAmex(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "amex" };

  const total = firstMatch(text, [
    /New Balance[:\s]*(?:\$|Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Total Amount Due[:\s]*(?:\$|Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Total New Balance[:\s]*(?:\$|Rs\.?\s*)?([\d,]+\.?\d*)/i,
  ]);
  if (total) details.totalAmountDue = cleanAmount(total[1]);

  const min = firstMatch(text, [
    /Minimum Payment Due[:\s]*(?:\$|Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Minimum Due[:\s]*(?:\$|Rs\.?\s*)?([\d,]+\.?\d*)/i,
  ]);
  if (min) details.minimumAmountDue = cleanAmount(min[1]);

  const due = firstMatch(text, [
    /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Please Pay By[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Pay By[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/i,
  ]);
  if (due) details.dueDate = due[1];

  const stmt = firstMatch(text, [
    /Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Closing Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ]);
  if (stmt) details.statementDate = stmt[1];

  return details;
}

/**
 * CSB Bank / Jupiter Money — these PDFs often extract with spaced-out glyphs
 * ("T o t a l") from subset/embedded fonts, so this matches on the intact
 * "Rs." amounts rather than the (unreliable) surrounding label text.
 */
export function parseCsb(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "csb" };

  const amounts = [...text.matchAll(/Rs\.?\s*([\d,]+\.?\d*)/g)].map((m) => m[1]);
  if (amounts.length >= 1) details.totalAmountDue = cleanAmount(amounts[0]);
  if (amounts.length >= 2) details.minimumAmountDue = cleanAmount(amounts[1]);

  // The due date is printed straight after the total, so it's only read from
  // there. A bill due at once says "Immediate" instead, and a closed card's last
  // bill has none: searching on found the statement period's start date (#56).
  const due = text.match(/Rs\.?\s*[\d,]+\.?\d*\s+(?:(\d{1,2}\s+[A-Za-z]+\s+\d{4})|(Immediate)\b)?/);
  if (due?.[1]) details.dueDate = due[1];
  else if (due?.[2]) details.noDueDate = "due immediately";

  const stmt = text.match(/Rs\.?\s*[\d,]+\.?\d*\s+(\d{2}[/-]\d{2}[/-]\d{4})/);
  if (stmt) details.statementDate = stmt[1];

  return details;
}

/** Fallback parser with patterns that work across many banks — used both standalone and to fill gaps. */
export function parseGeneric(text: string): ParsedStatementDetails {
  const details: ParsedStatementDetails = { bank: "unknown" };

  const total = firstMatch(text, [
    /Total Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Total Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Outstanding[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Current Balance[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
  ]);
  if (total) details.totalAmountDue = cleanAmount(total[1]);

  const min = firstMatch(text, [
    /Minimum Amount Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Min\.?\s*Amount\s*Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Minimum Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
    /Min\.?\s*Due[:\s]*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i,
  ]);
  if (min) details.minimumAmountDue = cleanAmount(min[1]);

  const due = firstMatch(text, [
    /Payment Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Due Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Pay By[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Due[:\s]*(\d{2}\s+\w+\s+\d{4})/i,
  ]);
  if (due) details.dueDate = due[1];

  const stmt = firstMatch(text, [
    /Statement Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Bill Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
    /Billing Date[:\s]*(\d{2}[/-]\d{2}[/-]\d{2,4})/i,
  ]);
  if (stmt) details.statementDate = stmt[1];

  return details;
}

export const BANK_PARSERS: Record<KnownBank, (text: string) => ParsedStatementDetails> = {
  hdfc: parseHdfc,
  icici: parseIcici,
  axis: parseAxis,
  sbi: parseSbi,
  yes: parseYes,
  kotak: parseKotak,
  amex: parseAmex,
  csb: parseCsb,
};
