import { fieldLabel, listOf } from "../format/skippedRows";
import { cleanAmountToNumber, parseFlexibleDateToIso } from "./normalize";
import type { ParsedStatementDetails } from "./types";

export interface StatementFields {
  statementDate: string;
  dueDate: string;
  totalAmountDue: number;
  minimumAmountDue: number;
}

/**
 * The fields, or why the statement can't be imported: the sync's reason for skipping it (#89).
 * A statement with no due date still has its statement date, so the sync can tell whether
 * it's already in the Sheet, added by hand (#54).
 */
export type StatementFieldsResult = { fields: StatementFields } | { problem: string; statementDate?: string };

/**
 * Converts a raw, string-typed extraction into the typed fields a
 * `Statement` row needs — or a problem if any field is missing or fails to
 * convert (e.g. a PDF that says there's no due date, or an amount that didn't
 * extract cleanly). A problem is the signal upstream to skip this statement
 * loudly rather than write a bad row.
 *
 * Also a problem for fields no real statement has, the same two rules the Add
 * statement form applies (readStatementForm): a due date on or before the
 * statement date, or a minimum due above the total (₹0 with a credit balance).
 * Either means the parser read the wrong number or date (#56).
 *
 * The problem names fields, never their values, like the skipped-rows notice.
 */
export function toStatementFields(details: ParsedStatementDetails): StatementFieldsResult {
  const statementDate = parseFlexibleDateToIso(details.statementDate);
  const dueDate = parseFlexibleDateToIso(details.dueDate);
  const totalAmountDue = cleanAmountToNumber(details.totalAmountDue);
  const minimumAmountDue = cleanAmountToNumber(details.minimumAmountDue);

  // A due date the PDF says it doesn't have isn't one that couldn't be read, and anything else unread is named first.
  const unread = Object.entries({ statementDate, dueDate, totalAmountDue, minimumAmountDue }).flatMap(([field, value]) =>
    value === null && !(field === "dueDate" && details.noDueDate) ? [fieldLabel(field)] : [],
  );
  if (unread.length > 0) return { problem: `couldn't read the ${listOf(unread)} from the PDF` };
  if (statementDate === null || dueDate === null || totalAmountDue === null || minimumAmountDue === null) {
    // Only the due date can be missing here, and the PDF says why.
    const problem = details.noDueDate === "due immediately" ? "the PDF shows no due date: it says the bill is due immediately" : "the PDF shows no due date, as nothing is owed on it";
    return { problem, ...(statementDate !== null && { statementDate }) };
  }
  if (dueDate <= statementDate) return { problem: "the due date read from the PDF isn't after its statement date, so one of them was misread" };
  if (minimumAmountDue > Math.max(0, totalAmountDue)) {
    return { problem: "the minimum amount due read from the PDF is more than its total amount due, so one of them was misread" };
  }

  return { fields: { statementDate, dueDate, totalAmountDue, minimumAmountDue } };
}
