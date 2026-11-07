"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import type { FormState } from "@/lib/forms/formState";
import { firstPayoutDate } from "@/lib/aggregate/lentPromises";
import { payoutIncomeSource, readExistingSource, readLentLoanForm, readPayoutSourceExtras, readRepaidForm, readRepaymentForm, type LentLoanInput, type PayoutSourceExtras } from "@/lib/forms/lentForms";
import { accountsRepository } from "@/lib/sheets/accounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { createIncomeSourceSchema, incomeSourcesRepository, updateIncomeSourceSchema } from "@/lib/sheets/incomeSources";
import { createLentLoanSchema, lentLoansRepository, updateLentLoanSchema } from "@/lib/sheets/lentLoans";
import { createLentRepaymentSchema, lentRepaymentsRepository } from "@/lib/sheets/lentRepayments";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

/**
 * The Lent page's server actions (docs/design/lent-out.md, task B1), used with useActionState like the other dashboards'. Each reads the
 * fields with lib/forms/lentForms (plain-word errors by field), then writes.
 *
 * - **A Paid-out loan can be added together with its income source** (ADR 0014): the source first, then the loan holding its id, and if the loan
 *   can't be written the source is taken out again, so it is both or neither. Unticked, the loan is saved on its own, "not linked".
 * - **A Paid-out loan can instead use an income source he already has** (`incomeSourceId`): it has to be on, free, and the same frequency and amount,
 *   and linking writes only the loan: his source is never changed by it.
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

/** Add a loan, or Edit one when the form carries an id. A mode change drops the other mode's fields (and, for an Accruing loan, its income source's link). */
export async function saveLentLoan(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = idOf(formData);
  let stored: LentLoan | null = null;
  let own: LentRepayment[] = [];
  let accountIds: string[] = [];
  let sources: IncomeSource[] = [];
  let linkedElsewhere: string[] = [];
  const wantsExisting = idOf(formData, "incomeSourceId") !== undefined;
  try {
    if (editing) {
      stored = await lentLoansRepository.get(editing);
      if (stored) own = repaymentsOf(await lentRepaymentsRepository.list(), editing);
    }
    // An existing income source is linked to a new loan, or to a paid-out loan that has none.
    if (wantsExisting && (!editing || (stored && !stored.incomeSourceId))) {
      const [allSources, allLoans] = await Promise.all([incomeSourcesRepository.list(), lentLoansRepository.list()]);
      sources = allSources;
      linkedElsewhere = allLoans.filter((l) => l.id !== editing && l.incomeSourceId).map((l) => l.incomeSourceId as string);
    }
    // An income source is made with a new loan, or for an existing paid-out loan that has none.
    if (formData.get("createIncomeSource") === "1" && (!editing || (stored && !stored.incomeSourceId))) {
      accountIds = (await accountsRepository.list()).map((a) => a.id);
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
  let linkTo: IncomeSource | undefined;
  if (wantsExisting && input.interestMode === "Paid-out" && (!editing || !stored?.incomeSourceId)) {
    const link = readExistingSource(fields(formData), input, { sources, linkedElsewhere });
    if (!link.ok) return { status: "invalid", errors: link.errors };
    linkTo = sources.find((x) => x.id === link.input.incomeSourceId);
  }
  return editing && stored ? editLoan(stored, input, formData, accountIds, linkTo) : addLoan(input, formData, accountIds, linkTo);
}

/** Add: a Paid-out loan with "Set up an income source" ticked gets its source first, taken out again if the loan can't be written. */
async function addLoan(input: LentLoanInput, formData: FormData, accountIds: string[], linkTo?: IncomeSource): Promise<FormState> {
  const withSource = !linkTo && input.interestMode === "Paid-out" && formData.get("createIncomeSource") === "1";
  let extras: PayoutSourceExtras = {};
  if (withSource) {
    const read = readPayoutSourceExtras(fields(formData), { accountIds });
    if (!read.ok) return { status: "invalid", errors: read.errors };
    extras = read.input;
  }
  let source: IncomeSource | undefined;
  try {
    if (withSource) source = await incomeSourcesRepository.create(createIncomeSourceSchema.parse(payoutIncomeSource(input, extras)));
    await lentLoansRepository.create(createLentLoanSchema.parse({ ...input, ...((source ?? linkTo) && { incomeSourceId: (source ?? linkTo)!.id }), status: "Active" }));
  } catch (error) {
    if (source) {
      try {
        await incomeSourcesRepository.remove(source.id);
      } catch (cleanup) {
        console.error("[lent] saveLentLoan: couldn't take back the income source:", cleanup instanceof Error ? cleanup.message : String(cleanup));
        updateTag(CACHE_TAGS.incomeSources);
        return { status: "invalid", errors: { form: `The loan wasn't saved, and its income source "${source.name}" is still in Income. Delete it there before trying again, or it will be added twice.` } };
      }
    }
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveLentLoan", error);
  }
  return source ? refreshed(CACHE_TAGS.lentLoans, CACHE_TAGS.incomeSources) : refreshed(CACHE_TAGS.lentLoans);
}

/**
 * Edit. A loan linked to an income source keeps it in step: a new payout amount becomes the source's usual amount; a new lent day moves the source's
 * schedule to the new first payout; how often it pays can't change here, since the source's schedule lives in Income; switching to Accruing pauses the source (nothing is deleted). Those two source writes come after the
 * loan's, and if one fails the message says so.
 */
async function editLoan(stored: LentLoan, input: LentLoanInput, formData: FormData, accountIds: string[], linkTo?: IncomeSource): Promise<FormState> {
  let source: IncomeSource | null = null;
  try {
    if (stored.incomeSourceId) source = await incomeSourcesRepository.get(stored.incomeSourceId);
  } catch (error) {
    return failed("saveLentLoan", error);
  }
  // A paid-out loan with no income source can be given one now: the source first, taken out again if the loan can't be saved.
  const linking = !linkTo && !stored.incomeSourceId && input.interestMode === "Paid-out" && formData.get("createIncomeSource") === "1";
  let extras: PayoutSourceExtras = {};
  if (linking) {
    const read = readPayoutSourceExtras(fields(formData), { accountIds });
    if (!read.ok) return { status: "invalid", errors: read.errors };
    extras = read.input;
  }
  let created: IncomeSource | undefined;
  if (source && input.interestMode === "Paid-out" && input.payoutFrequency !== source.frequency) {
    return { status: "invalid", errors: { payoutFrequency: "This loan's payouts follow an income source's schedule. Change how often it pays in Income, or take the loan off it" } };
  }
  const moved = stored.startDate !== input.startDate;
  try {
    if (linking) created = await incomeSourcesRepository.create(createIncomeSourceSchema.parse(payoutIncomeSource(input, extras)));
    // "" blanks a cell: the fields of the mode it left, and the colour when none is chosen.
    const accruing = input.interestMode === "Accruing";
    await lentLoansRepository.update(
      stored.id,
      updateLentLoanSchema.parse({
        ...input,
        interestRate: input.interestRate ?? "",
        payoutFrequency: input.payoutFrequency ?? "",
        payoutAmount: input.payoutAmount ?? "",
        color: input.color ?? "",
        ...(accruing && { incomeSourceId: "" }),
        ...((created ?? linkTo) && { incomeSourceId: (created ?? linkTo)!.id }),
      }) as Partial<Omit<LentLoan, "id">>,
    );
  } catch (error) {
    if (created) {
      try {
        await incomeSourcesRepository.remove(created.id);
      } catch (cleanup) {
        console.error("[lent] saveLentLoan: couldn't take back the income source:", cleanup instanceof Error ? cleanup.message : String(cleanup));
        updateTag(CACHE_TAGS.incomeSources);
        return { status: "invalid", errors: { form: `The loan wasn't saved, and its income source "${created.name}" is still in Income. Delete it there before trying again, or it will be added twice.` } };
      }
    }
    if (error instanceof NotFoundError) return gone("loan");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveLentLoan", error);
  }
  if (created) return refreshed(CACHE_TAGS.lentLoans, CACHE_TAGS.incomeSources);
  if (!source) return refreshed(CACHE_TAGS.lentLoans);
  const patch =
    input.interestMode === "Accruing"
      ? { status: "Inactive" as const }
      : input.payoutAmount !== source.expectedAmount || moved
        ? { ...(input.payoutAmount !== source.expectedAmount && { expectedAmount: input.payoutAmount }), ...(moved && { scheduleDate: firstPayoutDate(input) }) }
        : undefined;
  if (patch) {
    try {
      await incomeSourcesRepository.update(source.id, updateIncomeSourceSchema.parse(patch) as Partial<Omit<IncomeSource, "id">>);
    } catch (error) {
      console.error("[lent] saveLentLoan: the loan was saved, its income source wasn't updated:", error instanceof Error ? error.message : String(error));
      updateTag(CACHE_TAGS.lentLoans);
      const what = input.interestMode === "Accruing" ? "paused" : "brought in line with the loan";
      return { status: "invalid", errors: { form: `The loan was saved, but its income source "${source.name}" couldn't be ${what}. Do that in Income.` } };
    }
    return refreshed(CACHE_TAGS.lentLoans, CACHE_TAGS.incomeSources);
  }
  return refreshed(CACHE_TAGS.lentLoans);
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
