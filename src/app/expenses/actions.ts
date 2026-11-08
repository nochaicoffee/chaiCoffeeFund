"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import { readBigSpendForm } from "@/lib/forms/expenseForms";
import type { FormState } from "@/lib/forms/formState";
import { accountsRepository } from "@/lib/sheets/accounts";
import { bigSpendsRepository, createBigSpendSchema, updateBigSpendSchema } from "@/lib/sheets/bigSpends";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { cardsRepository } from "@/lib/sheets/cards";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";

/**
 * The Expenses page's server actions (docs/design/expenses.md, "Big spends"), used with useActionState like the other dashboards'. A big spend
 * names an account or a card that exists, or neither. Saving one changes no figure but the big spends: it explains a month, never adds to it.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const idOf = (formData: FormData) => {
  const value = formData.get("id");
  return typeof value === "string" && value !== "" ? value : undefined;
};
const gone: FormState = { status: "invalid", errors: { form: "This big spend isn't in the Sheet any more. Close this and refresh." } };

function failed(action: string, error: unknown): FormState {
  console.error(`[expenses] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

/** Add a big spend, or edit one when the form carries an id. An edit that blanks where it was paid from clears it. */
export async function saveBigSpend(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = idOf(formData);
  let known: { accountIds: string[]; cardIds: string[] };
  try {
    const [accounts, cards] = await Promise.all([accountsRepository.list(), cardsRepository.list()]);
    known = { accountIds: accounts.map((a) => a.id), cardIds: cards.map((c) => c.id) };
  } catch (error) {
    return failed("saveBigSpend", error);
  }
  const result = readBigSpendForm(fields(formData), known, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    if (editing) {
      const { input } = result;
      await bigSpendsRepository.update(editing, updateBigSpendSchema.parse({ ...input, paidFromAccountId: input.paidFromAccountId ?? "", paidFromCardId: input.paidFromCardId ?? "", note: input.note ?? "" }));
    } else {
      await bigSpendsRepository.create(createBigSpendSchema.parse(result.input));
    }
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveBigSpend", error);
  }
  updateTag(CACHE_TAGS.bigSpends);
  return { status: "saved", at: Date.now() };
}

export async function deleteBigSpend(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = idOf(formData);
  if (!id) return gone;
  try {
    await bigSpendsRepository.remove(id);
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    return failed("deleteBigSpend", error);
  }
  updateTag(CACHE_TAGS.bigSpends);
  return { status: "saved", at: Date.now() };
}
