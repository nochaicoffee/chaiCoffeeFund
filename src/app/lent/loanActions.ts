"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import type { FormState } from "@/lib/forms/formState";
import { readLentLoanForm, readRepaidForm, readRepaymentForm } from "@/lib/forms/lentForms";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { createLentLoanSchema, lentLoansRepository, updateLentLoanSchema } from "@/lib/sheets/lentLoans";
import { createLentRepaymentSchema, lentRepaymentsRepository } from "@/lib/sheets/lentRepayments";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { LentLoan, LentRepayment } from "@/lib/sheets/types";

/**
 * The Lent page's server actions (docs/design/lent-out.md, task B1), used with useActionState like the other dashboards'. Each reads the
 * fields with lib/forms/lentForms (plain-word errors by field), then writes.
 *
 * - **A repayment names a loan that exists**, and principal above what is out is a warning ("Record it anyway"), never a block.
 * - **Marking a loan repaid needs the closing day.** Reopening puts it back as active.
 * - **Deleting a loan deletes its repayments with it.** The loan goes first, then every repayment row that names it (rows that fail validation
 *   too, in one batch). If the repayments can't be deleted the loan is already gone, and the message says what is left: a repayment of a loan
 *   that isn't there counts for nothing, so this leaves nothing wrong on the page, where the other order would leave a loan whose repayments had gone.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const idOf = (formData: FormData, name = "id") => {
  const value = formData.get(name);
  return typeof value === "string" && value !== "" ? value : undefined;
};
const gone = (what: string): FormState => ({ status: "invalid", errors: { form: `This ${what} isn't in the Sheet any more. Close this and refresh.` } });

function failed(action: string, error: unknown): FormState {
  console.error(`[lent] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}
function refreshed(...tags: string[]): FormState {
  for (const tag of tags) updateTag(tag);
  return { status: "saved", at: Date.now() };
}
const repaymentsOf = (repayments: LentRepayment[], loanId: string) => repayments.filter((r) => r.lentLoanId === loanId);

/** Add a loan, or Edit one when the form carries an id. A mode change drops the other mode's fields (and an income source an Accruing loan can't have). */
export async function saveLentLoan(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = idOf(formData);
  let stored: LentLoan | null = null;
  let own: LentRepayment[] = [];
  try {
    if (editing) {
      stored = await lentLoansRepository.get(editing);
      if (stored) own = repaymentsOf(await lentRepaymentsRepository.list(), editing);
    }
  } catch (error) {
    return failed("saveLentLoan", error);
  }
  if (editing && !stored) return gone("loan");
  const earliestRepayment = own.map((r) => r.date).sort()[0];
  const principalReturned = own.filter((r) => r.kind === "Principal").reduce((t, r) => t + r.amount, 0);
  const result = readLentLoanForm(fields(formData), { earliestRepayment, principalReturned: editing ? principalReturned : undefined }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const input = result.input;
  if (editing && input.interestMode === "Paid-out" && own.some((r) => r.kind === "Interest")) {
    return { status: "invalid", errors: { interestMode: "Interest was recorded on this loan. A paid-out loan's interest arrives through Income, so delete those repayments first" } };
  }
  try {
    if (editing) {
      // "" blanks a cell: the fields of the mode it left, and the colour when none is chosen.
      const accruing = input.interestMode === "Accruing";
      await lentLoansRepository.update(
        editing,
        updateLentLoanSchema.parse({
          ...input,
          interestRate: input.interestRate ?? "",
          payoutFrequency: input.payoutFrequency ?? "",
          payoutAmount: input.payoutAmount ?? "",
          color: input.color ?? "",
          ...(accruing && { incomeSourceId: "" }),
        }) as Partial<Omit<LentLoan, "id">>,
      );
      return refreshed(CACHE_TAGS.lentLoans);
    }
    await lentLoansRepository.create(createLentLoanSchema.parse({ ...input, status: "Active" }));
    return refreshed(CACHE_TAGS.lentLoans);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("loan");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveLentLoan", error);
  }
}

/** Record money that came back on a loan: principal, or an Accruing loan's interest. */
export async function recordRepayment(_previous: FormState, formData: FormData): Promise<FormState> {
  const loanId = idOf(formData, "lentLoanId");
  if (!loanId) return gone("loan");
  let loan: LentLoan | null;
  let own: LentRepayment[];
  try {
    loan = await lentLoansRepository.get(loanId);
    own = repaymentsOf(await lentRepaymentsRepository.list(), loanId);
  } catch (error) {
    return failed("recordRepayment", error);
  }
  if (!loan) return gone("loan");
  const result = readRepaymentForm(fields(formData), loan, own, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors, ...("overridable" in result && { overridable: true }) };
  try {
    await lentRepaymentsRepository.create(createLentRepaymentSchema.parse({ lentLoanId: loanId, ...result.input }));
  } catch (error) {
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("recordRepayment", error);
  }
  return refreshed(CACHE_TAGS.lentRepayments);
}

/** Take back one repayment (a typo, or one entered twice). */
export async function deleteLentRepayment(_previous: FormState, formData: FormData): Promise<FormState> {
  const repaymentId = idOf(formData);
  if (!repaymentId) return gone("repayment");
  try {
    await lentRepaymentsRepository.remove(repaymentId);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("repayment");
    return failed("deleteLentRepayment", error);
  }
  return refreshed(CACHE_TAGS.lentRepayments);
}

/** Mark a loan repaid on the day the last of it came back. From that day it owes nothing and earns nothing. */
export async function markLentLoanRepaid(_previous: FormState, formData: FormData): Promise<FormState> {
  const loanId = idOf(formData);
  if (!loanId) return gone("loan");
  let loan: LentLoan | null;
  let own: LentRepayment[];
  try {
    loan = await lentLoansRepository.get(loanId);
    own = repaymentsOf(await lentRepaymentsRepository.list(), loanId);
  } catch (error) {
    return failed("markLentLoanRepaid", error);
  }
  if (!loan) return gone("loan");
  if (loan.status === "Repaid") return { status: "invalid", errors: { form: "This loan is already marked repaid. Refresh to see it." } };
  const result = readRepaidForm(fields(formData), loan, own, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    await lentLoansRepository.update(loanId, updateLentLoanSchema.parse({ status: "Repaid", closedDate: result.input.closedDate }) as Partial<Omit<LentLoan, "id">>);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("loan");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("markLentLoanRepaid", error);
  }
  return refreshed(CACHE_TAGS.lentLoans);
}

/** Put a repaid loan back as active: its closing day is cleared. */
export async function reopenLentLoan(_previous: FormState, formData: FormData): Promise<FormState> {
  const loanId = idOf(formData);
  if (!loanId) return gone("loan");
  try {
    await lentLoansRepository.update(loanId, updateLentLoanSchema.parse({ status: "Active", closedDate: "" }) as Partial<Omit<LentLoan, "id">>);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("loan");
    return failed("reopenLentLoan", error);
  }
  return refreshed(CACHE_TAGS.lentLoans);
}

/** Delete a loan and every repayment of it (see the note at the top for the order and what a failure leaves). */
export async function deleteLentLoan(_previous: FormState, formData: FormData): Promise<FormState> {
  const loanId = idOf(formData);
  if (!loanId) return gone("loan");
  try {
    await lentLoansRepository.remove(loanId);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("loan");
    return failed("deleteLentLoan", error);
  }
  try {
    await lentRepaymentsRepository.removeWhere((values) => values.lentLoanId === loanId);
  } catch (error) {
    updateTag(CACHE_TAGS.lentLoans);
    console.error("[lent] deleteLentLoan: the loan went, its repayments couldn't:", error instanceof Error ? error.message : String(error));
    return { status: "invalid", errors: { form: "The loan was deleted, but its repayments couldn't be. They count for nothing now. Delete the rows in LentRepayments that name it, or try again." } };
  }
  return refreshed(CACHE_TAGS.lentLoans, CACHE_TAGS.lentRepayments);
}
