import type { SkippedRow, SkippedRows } from "@/lib/sheets/rowReading";

/** What a page says about one tab's skipped rows: a bold headline, then the rows. */
export interface SkippedRowsNotice {
  /** "1 row in CardStatements couldn't be read" */
  headline: string;
  /** "row 7, total amount due is blank. Fix it in the Sheet, then refresh." */
  detail: string;
}

/** How many rows a notice names before it sums up the rest as "and 3 more rows". */
const MAX_ROWS_NAMED = 5;

/** "totalAmountDue" → "total amount due", "last4" → "last 4": the Sheet's column header, in words. */
export function fieldLabel(field: string): string {
  return field
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")
    .toLowerCase();
}

/** "a", "a and b", "a, b and c". */
function listOf(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * "row 7, total amount due and minimum amount due are blank, and status isn't valid".
 * Blank fields are named as blank. Any other problem reads "isn't valid" rather than
 * the schema's own message, so a rule message can never echo a cell's value.
 */
function rowPhrase({ rowNumber, problems }: SkippedRow): string {
  const blank = new Set<string>();
  const invalid = new Set<string>();
  let wholeRow = false;
  for (const { field, message } of problems) {
    // readRow names a problem with no field "row": a rule across several columns.
    if (field === "row") wholeRow = true;
    else if (message === "is blank") blank.add(fieldLabel(field));
    else invalid.add(fieldLabel(field));
  }
  for (const label of blank) invalid.delete(label);

  const parts: string[] = [];
  if (blank.size > 0) parts.push(`${listOf([...blank])} ${blank.size === 1 ? "is" : "are"} blank`);
  if (invalid.size > 0) parts.push(`${listOf([...invalid])} ${invalid.size === 1 ? "isn't" : "aren't"} valid`);
  if (wholeRow || parts.length === 0) parts.push("its cells don't fit together");
  return `row ${rowNumber}, ${parts.join(", and ")}`;
}

/**
 * The notice for one tab's skipped rows, or null when it has none:
 * "1 row in CardStatements couldn't be read: row 7, total amount due is blank. Fix it in the Sheet, then refresh."
 * It names the tab, the rows and the fields only, never cell values: a Cards row holds a PDF password.
 * "Then refresh", because the pages read through a cache that a hand edit to the Sheet doesn't clear.
 */
export function skippedRowsNotice({ tab, rows }: SkippedRows): SkippedRowsNotice | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.rowNumber - b.rowNumber);
  const named = sorted.slice(0, MAX_ROWS_NAMED).map(rowPhrase);
  const rest = sorted.length - named.length;
  const list = rest > 0 ? `${named.join("; ")}; and ${rest} more ${rest === 1 ? "row" : "rows"}` : named.join("; ");
  const one = rows.length === 1;
  return {
    headline: `${rows.length} ${one ? "row" : "rows"} in ${tab} couldn't be read`,
    detail: `${list}. Fix ${one ? "it" : "them"} in the Sheet, then refresh.`,
  };
}
