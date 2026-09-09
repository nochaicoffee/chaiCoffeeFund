import { cleanAmountToNumber, parseFlexibleDateToIso } from "./normalize";
import type { ParsedStatementDetails } from "./types";

export interface StatementFields {
  statementDate: string;
  dueDate: string;
  totalAmountDue: number;
  minimumAmountDue: number;
}

/**
 * Converts a raw, string-typed extraction into the typed fields a
 * `Statement` row needs — or `null` if any field is missing or fails to
 * convert (e.g. HDFC's "N/A (Credit Balance)" due date, or an amount that
 * didn't extract cleanly). `null` here is the signal upstream to skip this
 * statement loudly rather than write a bad row.
 */
export function toStatementFields(details: ParsedStatementDetails): StatementFields | null {
  const statementDate = parseFlexibleDateToIso(details.statementDate);
  const dueDate = parseFlexibleDateToIso(details.dueDate);
  const totalAmountDue = cleanAmountToNumber(details.totalAmountDue);
  const minimumAmountDue = cleanAmountToNumber(details.minimumAmountDue);

  if (statementDate === null || dueDate === null || totalAmountDue === null || minimumAmountDue === null) {
    return null;
  }

  return { statementDate, dueDate, totalAmountDue, minimumAmountDue };
}
