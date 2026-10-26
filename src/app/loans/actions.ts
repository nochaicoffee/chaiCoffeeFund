"use server";

import { updateTag } from "next/cache";
import { editPaymentProblem, excessOverEmi, markPaidProblem } from "@/lib/aggregate/loans";
import { formatShortDate, todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { FormState } from "@/lib/forms/formState";
import { readLoanForm, readMarkPaidForm, readPrepaymentForm } from "@/lib/forms/loanForms";
import { scheduleWithPrepayments, type PrepaymentEvent } from "@/lib/schedule/prepayments";
import { accountsRepository } from "@/lib/sheets/accounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { cardsRepository } from "@/lib/sheets/cards";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { loanInstallmentsRepository } from "@/lib/sheets/loanInstallments";
import { createLoanPrepaymentSchema, loanPrepaymentsRepository } from "@/lib/sheets/loanPrepayments";
import { createLoanSchema, createLoanWithSchedule, deleteLoanWithSchedule, loansRepository, updateLoanSchema, writeSchedule } from "@/lib/sheets/loans";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { Loan, LoanInstallment, LoanPrepayment } from "@/lib/sheets/types";

/**
 * The Loans forms' server actions (docs/design/loans.md, LoansForms), used with useActionState as the other
 * dashboards' are: each checks the input with lib/forms (plain-word errors by field), then writes. A failed write
 * returns { status: "failed" } so the dialog keeps the input for Try again.
 *
 * A prepayment touches two tabs, like creating a loan: its row, and the pending installments after it, which are
 * rebuilt from the loan's terms and all its prepayments (scheduleWithPrepayments). If the rebuild fails, the
 * prepayment row is removed and the schedule rebuilt without it, so the two never disagree for long.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());

function failed(action: string, error: unknown): FormState {
  console.error(`[loans] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

const gone = (what: string): FormState => ({ status: "invalid", errors: { form: `This ${what} isn't in the Sheet any more. Close this and refresh.` } });

function refreshed(undo?: { id: string; message: string }): FormState {
  updateTag(CACHE_TAGS.loans);
  updateTag(CACHE_TAGS.loanInstallments);
  updateTag(CACHE_TAGS.loanPrepayments);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}

const idOf = (formData: FormData, name = "id") => {
  const value = formData.get(name);
  return typeof value === "string" && value !== "" ? value : undefined;
};

async function knownPlaces() {
  const [accounts, cards] = await Promise.all([accountsRepository.list(), cardsRepository.list()]);
  return { accountIds: accounts.map((a) => a.id), cardIds: cards.map((c) => c.id) };
}

/** A prepayment as the schedule rebuild takes it: an EMI paid over comes after that EMI. */
function eventOf(p: LoanPrepayment, installments: LoanInstallment[]): PrepaymentEvent {
  const after = p.installmentId ? installments.find((i) => i.id === p.installmentId)?.installmentNumber : undefined;
  return { date: p.date, amount: p.amount, effect: p.effect, bankEmi: p.bankEmi, bankInstallments: p.bankInstallments, ...(after !== undefined && { afterInstallment: after }) };
}

/** Rebuilds a loan's pending installments from its terms and its prepayments, as they are in the Sheet now. */
async function rebuildLoan(loan: Loan): Promise<void> {
  const [installments, prepayments] = await Promise.all([loanInstallmentsRepository.list(), loanPrepaymentsRepository.list()]);
  const mine = installments.filter((i) => i.loanId === loan.id);
  const target = scheduleWithPrepayments(loan, prepayments.filter((p) => p.loanId === loan.id).map((p) => eventOf(p, mine)));
  await writeSchedule(loan.id, mine, target);
}

/** Saves a prepayment and rebuilds the schedule after it, or leaves things as they were. Closes the loan when it pays off the rest. */
async function addPrepayment(loan: Loan, row: Omit<LoanPrepayment, "id">, closes: boolean): Promise<LoanPrepayment> {
  const created = await loanPrepaymentsRepository.create(createLoanPrepaymentSchema.parse(row));
  try {
    await rebuildLoan(loan);
    if (closes) await loansRepository.update(loan.id, { status: "Closed" });
  } catch (error) {
    // Put it back as it was: no prepayment, the schedule without it.
    try {
      await loanPrepaymentsRepository.remove(created.id);
      await rebuildLoan(loan);
    } catch (undoError) {
      console.error("[loans] couldn't put the schedule back after a failed prepayment:", undoError instanceof Error ? undoError.message : String(undoError));
    }
    throw error;
  }
  return created;
}

/** Removes a prepayment and rebuilds the schedule without it; a loan it closed is active again. */
async function removePrepayment(prepaymentId: string): Promise<LoanPrepayment | null> {
  const prepayment = await loanPrepaymentsRepository.get(prepaymentId);
  if (!prepayment) return null;
  const loan = await loansRepository.get(prepayment.loanId);
  await loanPrepaymentsRepository.remove(prepaymentId);
  if (loan) {
    await rebuildLoan(loan);
    if (prepayment.effect === "Close" && loan.status === "Closed") await loansRepository.update(loan.id, { status: "Active" });
  }
  return prepayment;
}

// ---------- Add and Edit loan ----------

/** Add loan (with its whole schedule), or Edit loan when the form carries an id. */
export async function saveLoan(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = idOf(formData);
  let known: Awaited<ReturnType<typeof knownPlaces>>;
  try {
    known = await knownPlaces();
  } catch (error) {
    return failed("saveLoan", error);
  }
  const result = readLoanForm(fields(formData), known, Boolean(editing));
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const input = result.input;
  try {
    if (editing) {
      // The terms aren't on the form; an optional field left blank is cleared ("" blanks its cell, see `clearable`).
      const patch = updateLoanSchema.parse({
        name: input.name,
        lenderName: input.lenderName,
        category: input.category,
        processingFee: input.processingFee,
        stampDuty: input.stampDuty,
        preEmiInterest: input.preEmiInterest,
        accountId: input.accountId,
        emiPaidFromAccountId: input.emiPaidFromAccountId ?? "",
        emiPaidFromCardId: input.emiPaidFromCardId ?? "",
        prepaymentEffect: input.prepaymentEffect,
        color: input.color,
        prepaymentChargePercent: input.prepaymentChargePercent ?? "",
        prepaymentMaxPercent: input.prepaymentMaxPercent ?? "",
        prepaymentsPerYear: input.prepaymentsPerYear ?? "",
        prepaymentsInLoan: input.prepaymentsInLoan ?? "",
        prepaymentAfterEmis: input.prepaymentAfterEmis ?? "",
      });
      await loansRepository.update(editing, patch as Partial<Omit<Loan, "id">>);
      return refreshed();
    }
    const strip = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
    const { loan } = await createLoanWithSchedule(createLoanSchema.parse(strip({ ...input, repaymentStructure: "Standard-Emi", paymentFrequency: "Monthly", status: "Active" })));
    return refreshed({ id: `loan:${loan.id}`, message: `${loan.name} added with ${loan.tenureMonths} EMIs` });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("loan");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveLoan", error);
  }
}

/** Delete a loan, with its installments and prepayments. */
export async function deleteLoan(_previous: FormState, formData: FormData): Promise<FormState> {
  const loanId = idOf(formData);
  if (!loanId) return gone("loan");
  try {
    await deleteLoanWithSchedule(loanId);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("loan");
    if (error instanceof Error && error.message.startsWith(`Loan ${loanId} wasn't deleted`)) return { status: "invalid", errors: { form: error.message } };
    return failed("deleteLoan", error);
  }
  return refreshed();
}

// ---------- Mark paid ----------

/**
 * Mark an EMI paid. Paying more than the EMI and its overdue charge records the EMI at its own amount and the extra as
 * a prepayment (Excess-Emi) in the same save, which rebuilds the EMIs after it.
 */
export async function markEmiPaid(_previous: FormState, formData: FormData): Promise<FormState> {
  let installments: LoanInstallment[];
  let loans: Loan[];
  let known: Awaited<ReturnType<typeof knownPlaces>>;
  try {
    [installments, loans, known] = await Promise.all([loanInstallmentsRepository.list(), loansRepository.list(), knownPlaces()]);
  } catch (error) {
    return failed("markEmiPaid", error);
  }
  const pending = installments.filter((i) => i.status === "Pending");
  const result = readMarkPaidForm(fields(formData), { ...known, installmentIds: pending.map((i) => i.id) }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const input = result.input;
  const installment = pending.find((i) => i.id === input.installmentId)!;
  const loan = loans.find((l) => l.id === installment.loanId);
  if (!loan) return gone("loan");
  const problem = markPaidProblem(installment, installments, input.amountPaid, input.overdueCharge);
  if (problem) return { status: "invalid", errors: { amountPaid: problem } };
  const excess = excessOverEmi(installment, input.amountPaid, input.overdueCharge);
  const place = { paidFromAccountId: input.paidFromAccountId, paidFromCardId: input.paidFromCardId };
  try {
    await loanInstallmentsRepository.update(installment.id, {
      status: "Paid",
      paidDate: input.paidDate,
      amountPaid: excess ? Math.round((installment.totalDue + input.overdueCharge) * 100) / 100 : input.amountPaid,
      overdueCharge: input.overdueCharge || undefined,
      ...place,
    });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("EMI");
    return failed("markEmiPaid", error);
  }
  const label = `${loan.name} EMI ${installment.installmentNumber}`;
  // The undo id carries what was written, so a late Undo leaves a payment saved since alone.
  const written = `${input.paidDate}:${excess ? Math.round((installment.totalDue + input.overdueCharge) * 100) / 100 : input.amountPaid}`;
  if (!excess) return refreshed({ id: `paid:${installment.id}::${written}`, message: `${label} paid · ${formatInr(input.amountPaid)}` });
  // What's left after this EMI (none of it paid, see markPaidProblem): a prepayment that covers it closes the loan.
  const after = pending.filter((i) => i.loanId === loan.id && i.installmentNumber > installment.installmentNumber);
  const left = after.reduce((t, i) => t + i.principalDue, 0);
  const closes = excess >= left - 0.5;
  try {
    const prepayment = await addPrepayment(loan, { loanId: loan.id, date: input.paidDate, amount: closes ? Math.round(left * 100) / 100 : excess, charge: input.charge, effect: closes ? "Close" : input.effect, source: "Excess-Emi", installmentId: installment.id, ...place }, closes);
    return refreshed({ id: `paid:${installment.id}:${prepayment.id}:${written}`, message: `${label} paid · ${formatInr(excess)} prepaid${closes ? ", loan closed" : ""}` });
  } catch (error) {
    // The EMI is marked paid; the extra isn't saved. Say so rather than lose it quietly.
    console.error("[loans] markEmiPaid saved the EMI but not the prepayment:", error instanceof Error ? error.message : String(error));
    updateTag(CACHE_TAGS.loanInstallments);
    return { status: "invalid", errors: { form: `The EMI is marked paid, but the ${formatInr(excess)} above it couldn't be saved as a prepayment. Add it with Add prepayment.` } };
  }
}

/**
 * Edit payment: correct a paid EMI's date, amount (within the EMI and its charge), overdue charge or where it was paid
 * from. If the EMI was paid over, its prepayment follows the new date and place and the EMIs after it are worked out
 * again; if that fails both rows are put back.
 */
export async function editEmiPayment(_previous: FormState, formData: FormData): Promise<FormState> {
  let installments: LoanInstallment[];
  let loans: Loan[];
  let prepayments: LoanPrepayment[];
  let known: Awaited<ReturnType<typeof knownPlaces>>;
  try {
    [installments, loans, prepayments, known] = await Promise.all([loanInstallmentsRepository.list(), loansRepository.list(), loanPrepaymentsRepository.list(), knownPlaces()]);
  } catch (error) {
    return failed("editEmiPayment", error);
  }
  const paid = installments.filter((i) => i.status === "Paid");
  const result = readMarkPaidForm(fields(formData), { ...known, installmentIds: paid.map((i) => i.id) }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const input = result.input;
  const installment = paid.find((i) => i.id === input.installmentId)!;
  const loan = loans.find((l) => l.id === installment.loanId);
  if (!loan) return gone("loan");
  const problem = editPaymentProblem(installment, input.amountPaid, input.overdueCharge);
  if (problem) return { status: "invalid", errors: { amountPaid: problem } };
  // Both places are named so the one not chosen is cleared.
  const place = { paidFromAccountId: input.paidFromAccountId, paidFromCardId: input.paidFromCardId };
  const before = { paidDate: installment.paidDate, amountPaid: installment.amountPaid, overdueCharge: installment.overdueCharge, paidFromAccountId: installment.paidFromAccountId, paidFromCardId: installment.paidFromCardId };
  const linked = prepayments.find((p) => p.source === "Excess-Emi" && p.installmentId === installment.id);
  try {
    await loanInstallmentsRepository.update(installment.id, { paidDate: input.paidDate, amountPaid: input.amountPaid, overdueCharge: input.overdueCharge || undefined, ...place });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("EMI");
    return failed("editEmiPayment", error);
  }
  if (linked && (linked.date !== input.paidDate || linked.paidFromAccountId !== place.paidFromAccountId || linked.paidFromCardId !== place.paidFromCardId)) {
    try {
      await loanPrepaymentsRepository.update(linked.id, { date: input.paidDate, ...place });
      await rebuildLoan(loan);
    } catch (error) {
      try {
        await loanPrepaymentsRepository.update(linked.id, { date: linked.date, paidFromAccountId: linked.paidFromAccountId, paidFromCardId: linked.paidFromCardId });
        await loanInstallmentsRepository.update(installment.id, before);
        await rebuildLoan(loan);
      } catch (undoError) {
        console.error("[loans] couldn't put the payment back after a failed edit:", undoError instanceof Error ? undoError.message : String(undoError));
      }
      // The Sheet may not be as the pages last read it.
      refreshed();
      return failed("editEmiPayment", error);
    }
  }
  return refreshed();
}

/** Undo for Mark paid: the prepayment it made (if any) goes, and the EMI is pending again, if nothing has changed since. */
export async function undoMarkPaid(undoId: string): Promise<{ ok: boolean; message: string }> {
  const [, installmentId, prepaymentId, paidDate, amountPaid] = undoId.split(":");
  try {
    const installment = await loanInstallmentsRepository.get(installmentId);
    if (!installment || installment.status !== "Paid") return { ok: true, message: "Already put back." };
    if (installment.paidDate !== paidDate || installment.amountPaid !== Number(amountPaid)) return { ok: false, message: "This EMI has changed since, so it wasn't put back." };
    if (prepaymentId) await removePrepayment(prepaymentId);
    await loanInstallmentsRepository.update(installmentId, { status: "Pending", paidDate: undefined, amountPaid: undefined, overdueCharge: undefined, paidFromAccountId: undefined, paidFromCardId: undefined });
  } catch (error) {
    console.error("[loans] undoMarkPaid failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Refresh and try again." };
  }
  refreshed();
  return { ok: true, message: "Put back as it was." };
}

// ---------- Prepayments ----------

/** Add prepayment: saved with the schedule rebuilt after it. The bank's limits are warnings in the form, not checked here. */
export async function savePrepayment(_previous: FormState, formData: FormData): Promise<FormState> {
  let loans: Loan[];
  let installments: LoanInstallment[];
  let known: Awaited<ReturnType<typeof knownPlaces>>;
  try {
    [loans, installments, known] = await Promise.all([loansRepository.list(), loanInstallmentsRepository.list(), knownPlaces()]);
  } catch (error) {
    return failed("savePrepayment", error);
  }
  const active = loans.filter((l) => l.status === "Active");
  const result = readPrepaymentForm(fields(formData), { ...known, loanIds: active.map((l) => l.id) }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const input = result.input;
  const loan = active.find((l) => l.id === input.loanId)!;
  const mine = installments.filter((i) => i.loanId === loan.id).sort((a, b) => a.installmentNumber - b.installmentNumber);
  const paidAhead = mine.find((i) => i.status === "Paid" && i.dueDate > input.date);
  if (paidAhead) return { status: "invalid", errors: { date: `EMI ${paidAhead.installmentNumber}, due ${formatShortDate(paidAhead.dueDate)}, is already paid. Date it after that EMI` } };
  const owing = mine.find((i) => i.status === "Pending" && i.dueDate <= input.date);
  if (input.effect === "Close" && owing) return { status: "invalid", errors: { effect: `Mark EMI ${owing.installmentNumber} (due ${formatShortDate(owing.dueDate)}) paid first. Closing pays off what's left after it` } };
  const left = mine.filter((i) => i.status === "Pending" && i.dueDate > input.date).reduce((t, i) => t + i.principalDue, 0);
  if (left <= 0) return { status: "invalid", errors: { loanId: "Nothing is left to pay on this loan after that date" } };
  if (input.effect !== "Close" && input.amount > left + 0.5) return { status: "invalid", errors: { amount: `That's more than the ${formatInr(left)} left. Choose Close to pay it all off` } };
  const closes = input.effect === "Close" || input.amount >= left - 0.5;
  const { loanId, effect, ...rest } = input;
  try {
    const created = await addPrepayment(loan, { ...rest, loanId, amount: closes ? Math.round(left * 100) / 100 : input.amount, effect: closes ? "Close" : effect, source: "Manual" }, closes);
    return refreshed({ id: `prepay:${created.id}`, message: closes ? `${loan.name} closed · ${formatInr(created.amount)} paid off` : `${loan.name} · ${formatInr(created.amount)} prepaid` });
  } catch (error) {
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("savePrepayment", error);
  }
}

/** Undo for Add prepayment. */
export async function undoPrepayment(undoId: string): Promise<{ ok: boolean; message: string }> {
  try {
    await removePrepayment(undoId.split(":")[1]);
  } catch (error) {
    console.error("[loans] undoPrepayment failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Refresh and delete it from Prepayments instead." };
  }
  refreshed();
  return { ok: true, message: "Put back as it was." };
}

/** Undo for Add loan: deletes the loan just added, with its schedule. */
export async function undoAddLoan(undoId: string): Promise<{ ok: boolean; message: string }> {
  try {
    await deleteLoanWithSchedule(undoId.split(":")[1]);
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: true, message: "Already removed." };
    console.error("[loans] undoAddLoan failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Refresh and delete the loan instead." };
  }
  refreshed();
  return { ok: true, message: "Removed." };
}

/** Delete a prepayment: the EMIs after it are rebuilt without it. */
export async function deletePrepayment(_previous: FormState, formData: FormData): Promise<FormState> {
  const prepaymentId = idOf(formData);
  if (!prepaymentId) return gone("prepayment");
  try {
    const removed = await removePrepayment(prepaymentId);
    if (!removed) return gone("prepayment");
  } catch (error) {
    return failed("deletePrepayment", error);
  }
  return refreshed();
}

