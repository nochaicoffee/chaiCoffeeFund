import { decryptAndExtractText } from "../pdf/decryptAndExtractText";
import { parseEpfPassbookText } from "./parseEpfPassbookText";
import type { ParseEpfPassbookResult } from "./parseEpfPassbookText";

export { checkEpfPassbook, parseEpfPassbookText, passbookEntries } from "./parseEpfPassbookText";
export type { EpfPassbook, EpfPassbookChecks, EpfShares, ParseEpfPassbookResult, PassbookCredit, PassbookEntryDraft } from "./parseEpfPassbookText";

/**
 * An EPFO passbook PDF → its rows and checks, or why not. EPFO's files carry no password; one is tried only if given.
 * Nothing is saved here: the import shows every row and saves only what he confirms.
 */
export async function parseEpfPassbook(pdfBytes: Uint8Array, passwords: string[] = []): Promise<ParseEpfPassbookResult> {
  let read;
  try {
    read = await decryptAndExtractText(pdfBytes, passwords);
  } catch {
    return { ok: false, problem: "couldn't open the file as a PDF" };
  }
  if ("failure" in read) {
    return { ok: false, problem: read.failure === "no_password_matched" ? "the PDF is password protected" : "the PDF has no readable text" };
  }
  return parseEpfPassbookText(read.text);
}
