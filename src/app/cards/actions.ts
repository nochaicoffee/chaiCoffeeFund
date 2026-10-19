"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import { findDuplicateStatement, readCardForm, readMarkPaidForm, readStatementForm } from "@/lib/forms/cardForms";
import type { FormState } from "@/lib/forms/formState";
import { CACHE_TAGS, getCachedAccounts, getCachedCards, getCachedStatements } from "@/lib/sheets/cached";
import { cardsRepository, createCardSchema, updateCardSchema } from "@/lib/sheets/cards";
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

/** Logs a failed Sheet write without the form's values, which can include a PDF password. */
function failed(action: string, error: unknown): FormState {
  console.error(`[cards] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return { status: "failed" };
}

/**
 * Add card, or Edit card when the form carries an id. On edit, a blank PDF
 * password keeps the saved one ("clearPassword" removes it), while clearing
 * last 4, keywords or the usual account clears them.
 */
export async function saveCard(_previous: FormState, formData: FormData): Promise<FormState> {
  const accounts = await getCachedAccounts();
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
  const [cards, statements] = await Promise.all([getCachedCards(), getCachedStatements()]);
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

/** Mark paid: the amount, the date and where it came from (a bank account or a card, never both). */
export async function markPaid(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") return { status: "invalid", errors: { form: "This statement couldn't be found. Refresh and try again." } };
  const [statement, accounts, cards] = await Promise.all([statementsRepository.get(id), getCachedAccounts(), getCachedCards()]);
  if (!statement) return { status: "invalid", errors: { form: "This statement couldn't be found. Refresh and try again." } };
  const result = readMarkPaidForm(fields(formData), statement, { accountIds: accounts.map((a) => a.id), cardIds: cards.map((c) => c.id) }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    const patch = updateStatementSchema.parse({ status: "Paid", amountPaid: result.input.amountPaid, paidDate: result.input.paidDate });
    // Both payment sources are written, so switching from an account to a card clears the other.
    await statementsRepository.update(id, { ...patch, paidFromAccountId: result.input.paidFromAccountId, paidFromCardId: result.input.paidFromCardId });
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "invalid", errors: { form: "This statement couldn't be found. Refresh and try again." } };
    return failed("markPaid", error);
  }
  updateTag(CACHE_TAGS.statements);
  return { status: "saved", at: Date.now() };
}
