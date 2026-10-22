import { detectBank } from "./bankDetection";
import { BANK_PARSERS, parseGeneric } from "./bankParsers";
import type { Bank, ParsedStatementDetails } from "./types";

/**
 * Main entry point — auto-detects the bank if not given. A known bank is read
 * by its own parser alone, and the generic patterns are only for a bank this
 * app doesn't recognise. The statement import always gives the bank: the
 * matched card's issuer's (`checkStatementBank`), so it never uses them.
 *
 * The reference `parse_statement` router also filled a known bank's gaps from
 * the generic patterns. They search the whole text, so when ICICI's own pattern
 * stopped matching, they took both amounts from a worked example of the
 * minimum-due calculation on a later page, and the wrong statement would have
 * imported (#86). A field its own parser can't find now leaves the statement
 * incomplete, so it's skipped with a reason instead (#89).
 */
export function parseStatement(text: string, bank?: Bank): ParsedStatementDetails {
  const resolvedBank = bank ?? detectBank(text);
  return resolvedBank === "unknown" ? parseGeneric(text) : BANK_PARSERS[resolvedBank](text);
}
