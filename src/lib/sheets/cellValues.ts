import { ISO_DATE_PATTERN } from "../format/date";

/**
 * How a record's field is sent to Sheets with valueInputOption USER_ENTERED,
 * which parses each value the way typing it into the cell would:
 * - Dates go as plain ISO text ("2026-08-05"), so Sheets stores a real date and
 *   the Table's DATE column shows it as one. Writing the serial number instead
 *   shows a bare 46239.
 * - Other text gets a leading apostrophe, which tells Sheets to keep it exactly
 *   as written. Otherwise "0425" or a digits-only PDF password becomes a number
 *   and loses its leading zero, and text starting with "=" becomes a formula.
 *   The apostrophe isn't part of the stored value; reads return the text without it.
 *   Sheets strips only one, so text that already starts with "'" keeps its own.
 * - Numbers and booleans go as they are. A NaN or Infinity is refused: JSON
 *   would turn it into null and silently clear the cell.
 * See "Writing to Sheets" in docs/system-design.md.
 */
export function toUserEnteredCell(value: unknown, isDateColumn = false): unknown {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Refusing to write ${value} to the Sheet: it would silently clear the cell`);
  }
  if (typeof value !== "string") return value;
  return isDateColumn && ISO_DATE_PATTERN.test(value) ? value : `'${value}`;
}
