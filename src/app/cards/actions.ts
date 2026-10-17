"use server";

import { updateTag } from "next/cache";
import { todayIso } from "@/lib/format/date";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { cardsRepository, createCardSchema } from "@/lib/sheets/cards";
import { statementsRepository, createStatementSchema } from "@/lib/sheets/statements";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function optionalStr(formData: FormData, key: string): string | undefined {
  const value = str(formData, key);
  return value === "" ? undefined : value;
}

export async function createCard(formData: FormData): Promise<void> {
  const input = createCardSchema.parse({
    name: str(formData, "name"),
    alias: str(formData, "alias"),
    issuer: str(formData, "issuer"),
    cardType: str(formData, "cardType"),
    creditLimit: Number(str(formData, "creditLimit")),
    statementDay: Number(str(formData, "statementDay")),
    dueDayBuffer: Number(str(formData, "dueDayBuffer")),
    status: str(formData, "status"),
    last4: optionalStr(formData, "last4"),
    color: str(formData, "color"),
    statementPdfPassword: optionalStr(formData, "statementPdfPassword"),
    emailMatchKeywords: optionalStr(formData, "emailMatchKeywords"),
    defaultPaidFromAccountId: optionalStr(formData, "defaultPaidFromAccountId"),
  });
  await cardsRepository.create(input);
  updateTag(CACHE_TAGS.cards);
}

export async function createStatement(formData: FormData): Promise<void> {
  const input = createStatementSchema.parse({
    cardId: str(formData, "cardId"),
    statementDate: str(formData, "statementDate"),
    dueDate: str(formData, "dueDate"),
    totalAmountDue: Number(str(formData, "totalAmountDue")),
    minimumAmountDue: Number(str(formData, "minimumAmountDue")),
    status: "Pending",
  });
  await statementsRepository.create(input);
  updateTag(CACHE_TAGS.statements);
}

/** Marks a Pending statement Paid in one step — the only manual step once a statement exists. */
export async function markStatementPaid(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const amountPaid = Number(str(formData, "amountPaid"));
  const paidFromAccountId = optionalStr(formData, "paidFromAccountId");
  const paidFromCardId = optionalStr(formData, "paidFromCardId");

  await statementsRepository.update(id, {
    status: "Paid",
    amountPaid,
    paidDate: todayIso(),
    paidFromAccountId,
    paidFromCardId,
  });
  updateTag(CACHE_TAGS.statements);
}
