import { parseHdfc, isHdfcStatement } from "./hdfc";
import { isJupiterStatement, parseJupiter } from "./jupiter";
import { isSliceStatement, parseSlice } from "./slice";
import type { ParseResult } from "./types";

/**
 * Reads a bank account statement's text, whichever of the three banks it is. Each bank is
 * recognised by its statement's own layout, not by its name alone: a UPI narration in one bank's
 * statement names the others. A statement can hold several accounts (HDFC's combined one), so the
 * answer is a list. Null when it's none of them.
 */
export function parseAccountStatements(text: string): ParseResult[] | null {
  // Slice last: its test is the loosest (its name), and another bank's narrations can carry it ("Payment from slice").
  if (isJupiterStatement(text)) return [parseJupiter(text)];
  if (isHdfcStatement(text)) return parseHdfc(text);
  if (isSliceStatement(text)) return [parseSlice(text)];
  return null;
}
