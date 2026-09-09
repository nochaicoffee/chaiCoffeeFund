import { detectBank } from "./bankDetection";
import { BANK_PARSERS, parseGeneric } from "./bankParsers";
import type { Bank, ParsedStatementDetails } from "./types";

function isComplete(details: ParsedStatementDetails): boolean {
  return Boolean(details.totalAmountDue && details.minimumAmountDue && details.dueDate && details.statementDate);
}

/**
 * Main entry point — auto-detects the bank if not given, and fills any gap
 * left by the bank-specific parser with the generic fallback. Mirrors the
 * reference `parse_statement` router.
 */
export function parseStatement(text: string, bank?: Bank): ParsedStatementDetails {
  const resolvedBank = bank ?? detectBank(text);
  const parser = resolvedBank === "unknown" ? parseGeneric : BANK_PARSERS[resolvedBank];
  const details = parser(text);

  if (!isComplete(details)) {
    const generic = parseGeneric(text);
    if (!details.totalAmountDue && generic.totalAmountDue) details.totalAmountDue = generic.totalAmountDue;
    if (!details.minimumAmountDue && generic.minimumAmountDue) details.minimumAmountDue = generic.minimumAmountDue;
    if (!details.dueDate && generic.dueDate) details.dueDate = generic.dueDate;
    if (!details.statementDate && generic.statementDate) details.statementDate = generic.statementDate;
  }

  return details;
}
