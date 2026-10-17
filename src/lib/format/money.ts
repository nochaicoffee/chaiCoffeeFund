const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Compact units, smallest first. Each is 100× the one before it (1 L = 100 k, 1 Cr = 100 L). */
const COMPACT_UNITS: [number, string][] = [
  [1e3, "k"],
  [1e5, "L"],
  [1e7, "Cr"],
];

/** U+2212, the typographic minus the design uses for negative amounts (−₹6,400). */
const MINUS = "−";

/** Shown for a missing or invalid amount (for example a blank Sheet cell), never "₹NaN". */
const NO_VALUE = "—";

/** Full amount with Indian digit grouping: 239700 → "₹2,39,700", -6400 → "−₹6,400". */
export function formatInr(value: number): string {
  if (!Number.isFinite(value)) return NO_VALUE;
  const formatted = inr.format(Math.abs(value));
  return value < 0 && Math.round(Math.abs(value)) !== 0 ? MINUS + formatted : formatted;
}

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The amount as a statement prints it: paise only when there are any.
 * 38500 → "₹38,500", 38512.4 → "₹38,512.40", 0.1 → "₹0.10".
 */
export function formatInrExact(value: number): string {
  if (!Number.isFinite(value)) return NO_VALUE;
  const abs = Math.round(Math.abs(value) * 100) / 100;
  if (abs === 0) return "₹0";
  const formatted = Number.isInteger(abs) ? inr.format(abs) : inrPaise.format(abs);
  return value < 0 ? MINUS + formatted : formatted;
}

/**
 * Amount text as it's typed or printed, as a number, or null when it isn't one:
 * "38500", "₹38,500.50", "Rs. 5,000.00", "INR 5000", "-14,238.61", and the
 * typographic minus this app displays ("−₹6,400"). Only plain digits with an
 * optional sign and decimals count, so "1e3", "0x10" and "38.5k" are null.
 */
export function parseAmountText(text: string): number | null {
  const cleaned = text
    .replace(/\u2212/g, "-")
    .replace(/[₹,\s]/g, "")
    .replace(/^(-?)(Rs\.?|INR)/i, "$1");
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
}

/** Rounds to one decimal of `size`, dividing by size/10 so .x5 cases don't drift in binary floating point. */
function oneDecimal(abs: number, size: number): number {
  return Math.round(abs / (size / 10)) / 10;
}

/**
 * Short form for charts and tight labels, one decimal like the design:
 * 950 → "₹950", 41000 → "₹41.0k", 57300 → "₹57.3k", 240000 → "₹2.4L", 12500000 → "₹1.3Cr".
 * Uses the largest unit the amount reaches, and moves up one unit only when rounding
 * reaches it (99,960 → "₹1.0L", but 95,000 stays "₹95.0k").
 */
export function formatInrCompact(value: number): string {
  if (!Number.isFinite(value)) return NO_VALUE;
  const sign = value < 0 ? MINUS : "";
  const abs = Math.abs(value);
  const whole = Math.round(abs);
  if (whole < 1000) {
    return whole === 0 ? "₹0" : `${sign}₹${whole}`;
  }
  let i = 0;
  while (i + 1 < COMPACT_UNITS.length && abs >= COMPACT_UNITS[i + 1][0]) i++;
  let scaled = oneDecimal(abs, COMPACT_UNITS[i][0]);
  if (i + 1 < COMPACT_UNITS.length && scaled >= COMPACT_UNITS[i + 1][0] / COMPACT_UNITS[i][0]) {
    i++;
    scaled = oneDecimal(abs, COMPACT_UNITS[i][0]);
  }
  return `${sign}₹${scaled.toFixed(1)}${COMPACT_UNITS[i][1]}`;
}
