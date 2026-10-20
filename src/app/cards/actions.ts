"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import { findDuplicateStatement, readCardForm, readMarkPaidForm, readStatementForm } from "@/lib/forms/cardForms";
import type { FormState } from "@/lib/forms/formState";
import { canUndo, completePayment, payInFull, paymentFields, type PaymentFields } from "@/lib/forms/quickPay";
import { CACHE_TAGS, getCachedAccounts, getCachedCards, getCachedStatements } from "@/lib/sheets/cached";
import { cardsRepository, createCardSchema, updateCardSchema } from "@/lib/sheets/cards";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { NotFoundError } from "@/lib/sheets/repository";
import { createStatementSchema, statementsRepository, updateStatementSchema } from "@/lib/sheets/statements";

/**
 * The Cards forms' server actions (#51), used with useActionState. Each one
 * checks the input with lib/forms (plain-word errors by field), checks it again
 * with the entity's zod schema, then writes. Nothing reaches the Sheet until
 * both pass. A failed write returns { status: "failed" } and the dialog keeps
 * the input for Try again.
 */

function fields(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/**
 * Logs a failed Sheet read or write without the form's values, which can include a PDF password.
 * A used-up quota says so, so the dialog can say to wait a minute (lib/sheets/errors.ts).
 */
function failed(action: string, error: unknown): FormState {
  console.error(`[cards] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

/**
 * Add card, or Edit card when the form carries an id. On edit, a blank PDF
 * password keeps the saved one ("clearPassword" removes it), while clearing
 * last 4, keywords or the usual account clears them.
 */
export async function saveCard(_previous: FormState, formData: FormData): Promise<FormState> {
  let accounts: Awaited<ReturnType<typeof getCachedAccounts>>;
  try {
    accounts = await getCachedAccounts();
  } catch (error) {
    return failed("saveCard", error);
  }
  const result = readCardForm(fields(formData), { accountIds: accounts.map((a) => a.id) });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const id = formData.get("id");
  try {
    if (typeof id === "string" && id !== "") {
      const { statementPdfPassword, ...rest } = updateCardSchema.parse(result.input);
      await cardsRepository.update(id, {
        ...rest,
        last4: result.input.last4,
        emailMatchKeywords: result.input.emailMatchKeywords,
        defaultPaidFromAccountId: result.input.defaultPaidFromAccountId,
        ...(statementPdfPassword !== undefined && { statementPdfPassword }),
        ...(formData.get("clearPassword") === "1" && { statementPdfPassword: undefined }),
      });
    } else {
      await cardsRepository.create(createCardSchema.parse(result.input));
    }
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "invalid", errors: { form: "This card isn't in the Cards tab any more. Close this and refresh." } };
    return failed("saveCard", error);
  }
  updateTag(CACHE_TAGS.cards);
  return { status: "saved", at: Date.now() };
}

/**
 * Add statement, always Pending. A statement for the same card and statement
 * date is reported back unless the form says "save anyway" (the design warns,
 * it doesn't block).
 */
export async function saveStatement(_previous: FormState, formData: FormData): Promise<FormState> {
  let cards: Awaited<ReturnType<typeof getCachedCards>>, statements: Awaited<ReturnType<typeof getCachedStatements>>;
  try {
    [cards, statements] = await Promise.all([getCachedCards(), getCachedStatements()]);
  } catch (error) {
    return failed("saveStatement", error);
  }
  const result = readStatementForm(fields(formData), { cardIds: cards.map((c) => c.id) });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const duplicate = findDuplicateStatement(statements, result.input.cardId, result.input.statementDate);
  if (duplicate && formData.get("saveAnyway") !== "1") {
    return {
      status: "invalid",
      errors: { statementDate: "Matches an existing statement" },
      duplicate: { id: duplicate.id, cardId: duplicate.cardId, statementDate: duplicate.statementDate, totalAmountDue: duplicate.totalAmountDue, status: duplicate.status },
    };
  }
  try {
    await statementsRepository.create(createStatementSchema.parse({ ...result.input, status: "Pending" }));
  } catch (error) {
    return failed("saveStatement", error);
  }
  updateTag(CACHE_TAGS.statements);
  return { status: "saved", at: Date.now() };
}

/**
 * Mark paid and Edit payment: the total paid on the bill, the latest payment's
 * date and where it came from (a bank account or a card, never both). A payment
 * short of the total due leaves the bill Pending when the rest is still to pay,
 * so this can also reopen a paid bill (#84).
 */
export async function markPaid(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") return { status: "invalid", errors: { form: "This statement couldn't be found. Refresh and try again." } };
  let loaded: [Awaited<ReturnType<typeof statementsRepository.get>>, Awaited<ReturnType<typeof getCachedAccounts>>, Awaited<ReturnType<typeof getCachedCards>>];
  try {
    loaded = await Promise.all([statementsRepository.get(id), getCachedAccounts(), getCachedCards()]);
  } catch (error) {
    return failed("markPaid", error);
  }
  const [statement, accounts, cards] = loaded;
  if (!statement) return { status: "invalid", errors: { form: "This statement couldn't be found. Refresh and try again." } };
  const result = readMarkPaidForm(fields(formData), statement, { accountIds: accounts.map((a) => a.id), cardIds: cards.map((c) => c.id) }, todayIso());
  if (!result.ok) {
    // The dialog only asks about the rest when it sees the payment as short. If it didn't ask, the Sheet's total has changed since the page loaded.
    if (result.errors.rest && !formData.has("rest")) return { status: "invalid", errors: { form: "This statement's total due has changed. Close this and refresh." } };
    return { status: "invalid", errors: result.errors };
  }
  try {
    const patch = updateStatementSchema.parse({ status: result.input.status, amountPaid: result.input.amountPaid, paidDate: result.input.paidDate });
    // Both payment sources are written, so switching from an account to a card clears the other.
    await statementsRepository.update(id, { ...patch, paidFromAccountId: result.input.paidFromAccountId, paidFromCardId: result.input.paidFromCardId });
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "invalid", errors: { form: "This statement couldn't be found. Refresh and try again." } };
    return failed("markPaid", error);
  }
  updateTag(CACHE_TAGS.statements);
  return { status: "saved", at: Date.now() };
}

/** What a one-click payment from the dashboard did (#103): what it wrote and what was there, for its toast and Undo. */
export type QuickPayResult = { ok: true; written: PaymentFields; before: PaymentFields } | { ok: false; message: string };

const NOT_FOUND = "This statement couldn't be found. Refresh and try again.";

/** A one-click payment that couldn't reach the Sheet: logged without values, told in words (lib/sheets/errors.ts). */
function quickPayFailed(action: string, error: unknown): QuickPayResult {
  console.error(`[cards] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return { ok: false, message: sheetsFailureMessage(error) };
}

/**
 * Writes a statement's payment fields, all of them, so a blank one is cleared
 * rather than left as it was. completePayment puts back the blanks a server
 * action's arguments lose on the way from the browser.
 */
async function writePayment(id: string, payment: PaymentFields): Promise<void> {
  const complete = completePayment(payment);
  updateStatementSchema.parse(complete);
  await statementsRepository.update(id, complete);
}

/**
 * Mark paid in one click from the Cards page's Statements panel (#103): paid in
 * full today, from the card's usual account (payInFull). Part payments and
 * other accounts still go through the Mark paid form.
 */
export async function payStatementInFull(id: string): Promise<QuickPayResult> {
  let statement: Awaited<ReturnType<typeof statementsRepository.get>>, cards: Awaited<ReturnType<typeof getCachedCards>>;
  try {
    [statement, cards] = await Promise.all([statementsRepository.get(id), getCachedCards()]);
  } catch (error) {
    return quickPayFailed("payStatementInFull", error);
  }
  if (!statement) return { ok: false, message: NOT_FOUND };
  if (statement.status !== "Pending") return { ok: false, message: "This bill is already marked paid. Refresh to see it." };
  const before = paymentFields(statement);
  const written = payInFull(statement, cards.find((card) => card.id === statement.cardId), todayIso());
  try {
    await writePayment(id, written);
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false, message: NOT_FOUND };
    return quickPayFailed("payStatementInFull", error);
  }
  updateTag(CACHE_TAGS.statements);
  return { ok: true, written, before };
}

/** Undo for payStatementInFull: puts the payment back as it was, unless the bill has been changed since (canUndo). */
export async function undoStatementPayment(id: string, written: PaymentFields, before: PaymentFields): Promise<QuickPayResult> {
  let statement: Awaited<ReturnType<typeof statementsRepository.get>>;
  try {
    statement = await statementsRepository.get(id);
  } catch (error) {
    return quickPayFailed("undoStatementPayment", error);
  }
  if (!statement) return { ok: false, message: NOT_FOUND };
  if (!canUndo(statement, completePayment(written))) return { ok: false, message: "This bill has changed since, so it wasn't put back. Edit its payment on the Statements page." };
  try {
    await writePayment(id, before);
  } catch (error) {
    if (error instanceof NotFoundError) return { ok: false, message: NOT_FOUND };
    return quickPayFailed("undoStatementPayment", error);
  }
  updateTag(CACHE_TAGS.statements);
  return { ok: true, written: before, before: written };
}
