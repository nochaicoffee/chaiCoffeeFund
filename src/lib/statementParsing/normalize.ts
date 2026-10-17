import { parseAmountText } from "../format/money";

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Strip commas/spaces and a leading Rs./INR marker — ported from the reference parser's `clean_amount`. */
export function cleanAmount(raw: string): string {
  const stripped = raw.replace(/,/g, "").replace(/\s/g, "").trim();
  return stripped.replace(/^(Rs\.?|INR)\s*/i, "");
}

/** The amount as a number — `null` (never NaN) when the input can't be read as one. Same rules as a Sheet cell's amount text (parseAmountText). */
export function cleanAmountToNumber(raw: string | undefined): number | null {
  return raw ? parseAmountText(raw) : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parses exactly the date shapes the bank-specific regex parsers actually
 * produce into a plain ISO `YYYY-MM-DD` string, or `null` if none match.
 *
 * Deliberately does NOT fall back to the JS `Date` constructor for numeric
 * dates: this project's statements are day-first ("04/09/2025" means 4
 * September), and `new Date("04/09/2025")` reads it as month-first —
 * silently swapping day and month for any day <= 12. The old Apps Script
 * reference (`Utils.gs`'s `normalizeDate`) has exactly that fallback path;
 * it's not ported here on purpose.
 */
export function parseFlexibleDateToIso(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();

  // Already ISO.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;

  // DD/MM/YYYY or DD-MM-YYYY (day-first, as used throughout Indian bank statements).
  const numeric = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  // "DD Mon YYYY" or "DD Mon, YYYY" (e.g. "04 Feb 2026", "15 Jan, 2026").
  const ddMonYyyy = value.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (ddMonYyyy) {
    const day = Number(ddMonYyyy[1]);
    const month = MONTH_INDEX[ddMonYyyy[2].slice(0, 3).toLowerCase()];
    const year = Number(ddMonYyyy[3]);
    if (month === undefined) return null;
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
  }

  // "Month DD, YYYY" (e.g. "February 04, 2026").
  const monthDdYyyy = value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDdYyyy) {
    const month = MONTH_INDEX[monthDdYyyy[1].slice(0, 3).toLowerCase()];
    const day = Number(monthDdYyyy[2]);
    const year = Number(monthDdYyyy[3]);
    if (month === undefined) return null;
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
  }

  return null;
}
