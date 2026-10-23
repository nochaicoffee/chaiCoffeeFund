/** Small readers shared by the bank parsers. Pure. */

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** The month number for "Aug", "august" or "AUG", or null. */
export function monthNumber(name: string): number | null {
  return MONTHS[name.slice(0, 3).toLowerCase()] ?? null;
}

/** A real calendar date as YYYY-MM-DD, or null (31 Feb is not one). */
export function isoFrom(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** "21 Aug '25" or "21 Aug 2025" or "21-AUG-2025" → "2025-08-21". A two-digit year is 20xx. */
export function parseNamedMonthDate(text: string): string | null {
  const m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+'?(\d{2}|\d{4})$/.exec(text.trim());
  if (!m) return null;
  const month = monthNumber(m[2]);
  if (!month) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return isoFrom(year, month, Number(m[1]));
}

/** "dd/mm/yy" or "dd/mm/yyyy" → ISO. Day first, as Indian banks print it. */
export function parseSlashDate(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(text.trim());
  if (!m) return null;
  return isoFrom(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]), Number(m[1]));
}

/**
 * An amount as printed → rupees, to the paisa. Takes ₹ or Rs, lakh grouping ("1,23,456.78"), any
 * number of decimals ("₹99.9" is 99.90, "₹500" is 500), a leading "-" or "(…)" for negative, and a
 * trailing Dr (negative) or Cr. Null when it isn't an amount.
 */
export function parseRupees(text: string): number | null {
  const m = /^\s*(-|\()?\s*(?:₹|Rs\.?)?\s*(-)?([\d,]+(?:\.\d+)?)\)?\s*(Dr|Cr)?\.?\s*$/i.exec(text);
  // "--5" or "(-5)": two signs is a misread, not a positive.
  if (!m || (m[1] && m[2])) return null;
  const digits = m[3].replace(/,/g, "");
  if (digits === "" || /^\.|,,/.test(m[3])) return null;
  const value = Math.round(Number(digits) * 100) / 100;
  if (!Number.isFinite(value)) return null;
  const negative = Boolean(m[1] || m[2]) || m[4]?.toLowerCase() === "dr";
  return negative ? -value : value;
}

/** Last 4 digits of an account number, or undefined when there are fewer than 4. */
export const last4Of = (accountNumber: string): string | undefined => {
  const digits = accountNumber.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : undefined;
};
