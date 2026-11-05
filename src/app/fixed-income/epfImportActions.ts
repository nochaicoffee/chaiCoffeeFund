"use server";

import { updateTag } from "next/cache";
import type { FormState } from "@/lib/forms/formState";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfAccountsRepository } from "@/lib/sheets/epfAccounts";
import { epfEntriesRepository } from "@/lib/sheets/epfEntries";
import { epfRatesRepository } from "@/lib/sheets/epfRates";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import type { EpfAccount, EpfEntry, EpfRate } from "@/lib/sheets/types";
import { commitEpfImport } from "@/lib/epfStatement/commitImport";
import { parseDecisions } from "@/lib/epfStatement/decisions";
import { MAX_PASSBOOK_BYTES } from "@/lib/epfStatement/limits";
import { planEpfImport } from "@/lib/epfStatement/importPlan";
import { parseEpfPassbook } from "@/lib/epfStatement/index";
import type { EpfPassbook } from "@/lib/epfStatement/index";

/**
 * "Add EPF statement" (ADR 0011): two server actions, both given the PDF.
 * - `readEpfStatement` reads the file and sends the review everything it needs to plan the import in the browser: the passbook, and
 *   the account's rows and rates. Nothing is written.
 * - `confirmEpfStatement` reads the same file again, applies only his corrections and answers (never rows from the browser), plans
 *   against fresh Sheet data, and writes only if the plan has no problems.
 * The file is not kept between them, and the UAN, date of birth and name never leave the parser.
 */


export type ReadEpfStatementResult =
  | { status: "read"; passbook: EpfPassbook; accounts: EpfAccount[]; entries: EpfEntry[]; rates: EpfRate[] }
  /** The file isn't something that can be imported; `problem` says why without repeating anything from it. */
  | { status: "unreadable"; problem: string }
  | { status: "failed"; message?: string };

async function pdfFrom(formData: FormData): Promise<{ bytes: Uint8Array } | { problem: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { problem: "Choose the passbook PDF first" };
  if (file.size > MAX_PASSBOOK_BYTES) return { problem: "That file is too big to be an EPF passbook (they are about 120 KB)" };
  return { bytes: new Uint8Array(await file.arrayBuffer()) };
}

export async function readEpfStatement(formData: FormData): Promise<ReadEpfStatementResult> {
  const pdf = await pdfFrom(formData);
  if ("problem" in pdf) return { status: "unreadable", problem: pdf.problem };
  const parsed = await parseEpfPassbook(pdf.bytes);
  if (!parsed.ok) return { status: "unreadable", problem: `Couldn't read this file: ${parsed.problem}` };
  try {
    const [accounts, entries, rates] = await Promise.all([epfAccountsRepository.list(), epfEntriesRepository.list(), epfRatesRepository.list()]);
    return { status: "read", passbook: parsed.passbook, accounts, entries, rates };
  } catch (error) {
    console.error("[fixed-income] readEpfStatement failed:", error instanceof Error ? error.message : String(error));
    return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
  }
}

const invalid = (message: string): FormState => ({ status: "invalid", errors: { form: message } });

export async function confirmEpfStatement(formData: FormData): Promise<FormState> {
  const pdf = await pdfFrom(formData);
  if ("problem" in pdf) return invalid(pdf.problem);
  const decisions = parseDecisions(String(formData.get("decisions") ?? ""));
  if (!decisions) return invalid("The answers sent with the file couldn't be read. Close this and start again.");
  const parsed = await parseEpfPassbook(pdf.bytes);
  if (!parsed.ok) return invalid(`Couldn't read this file: ${parsed.problem}`);

  try {
    const [accounts, entries, rates] = await Promise.all([epfAccountsRepository.list(), epfEntriesRepository.list(), epfRatesRepository.list()]);
    const plan = planEpfImport({ original: parsed.passbook, edits: decisions.edits, accounts, entries, rates, choice: decisions.choice, resolutions: decisions.resolutions, contradicted: decisions.contradicted });
    if (plan.blockers.length > 0) return invalid(plan.blockers[0]);
    await commitEpfImport(plan, { accounts: epfAccountsRepository, entries: epfEntriesRepository });
  } catch (error) {
    console.error("[fixed-income] confirmEpfStatement failed:", error instanceof Error ? error.message : String(error));
    return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
  }
  updateTag(CACHE_TAGS.epfAccounts);
  updateTag(CACHE_TAGS.epfEntries);
  return { status: "saved", at: Date.now() };
}
