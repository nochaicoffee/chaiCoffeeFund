import { CARD_COLORS, CARD_ISSUERS, CARD_TYPES, type CardColor, type CardIssuer, type CardStatus, type CardType, type Statement } from "../sheets/types";
import { FieldReader, readPaidFrom, type FormFields, type FormResult } from "./fields";

/**
 * The Add card / Edit card, Add statement and Mark paid forms (#51), as
 * designed in docs/design/cards-forms.md: each one's fields read into the input
 * its repository expects, or plain-word errors by field. The wording here is the
 * source of truth for the forms' messages.
 */

const CARD_STATUSES: readonly CardStatus[] = ["Active", "Inactive", "Closed"];

export interface CardInput {
  name: string;
  alias: string;
  issuer: CardIssuer;
  cardType: CardType;
  status: CardStatus;
  last4?: string;
  creditLimit: number;
  statementDay: number;
  dueDayBuffer: number;
  color: CardColor;
  defaultPaidFromAccountId?: string;
  statementPdfPassword?: string;
  emailMatchKeywords?: string;
}

/** "HDFC,  millennia ,HDFC" → "HDFC, millennia": trimmed, blanks and repeats (ignoring case) dropped. */
export function normalizeKeywords(text: string): string | undefined {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const word of text.split(",").map((w) => w.trim())) {
    if (word === "" || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    words.push(word);
  }
  return words.length > 0 ? words.join(", ") : undefined;
}

/**
 * Add card and Edit card. The short name falls back to the card name (the Sheet
 * needs one). Last 4 is optional: the statement import fills it in (#78). A PDF
 * password is kept exactly as typed; left blank it's simply absent, which Edit
 * card treats as "keep the saved one".
 */
export function readCardForm(fields: FormFields, known: { accountIds: string[] }): FormResult<CardInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Enter the card name");
  const alias = f.text("alias") ?? name;
  const issuer = f.choice("issuer", CARD_ISSUERS, "Choose the bank that issued the card");
  const cardType = f.choice("cardType", CARD_TYPES, "Choose whether the card earns reward points or cashback");
  const status = f.choice("status", CARD_STATUSES, "Choose whether the card is active, inactive or closed");
  const last4 = f.text("last4");
  if (last4 !== undefined && !/^\d{4}$/.test(last4)) f.fail("last4", "Enter the last 4 digits of the card number");
  const creditLimit = f.amount("creditLimit", { required: "Enter the credit limit", label: "credit limit" });
  const statementDay = f.integer("statementDay", { min: 1, max: 31, message: "Choose the day of the month the statement is generated" });
  const dueDayBuffer = f.integer("dueDayBuffer", { min: 1, max: 60, message: "Enter the days from statement to due date (1–60)" });
  const color = f.choice("color", CARD_COLORS, "Pick a colour");
  const account = f.text("defaultPaidFromAccountId");
  if (account !== undefined && !known.accountIds.includes(account)) f.fail("defaultPaidFromAccountId", "Choose one of your accounts");
  const password = f.raw("statementPdfPassword");
  const keywords = normalizeKeywords(f.raw("emailMatchKeywords"));

  return f.result({
    name: name!,
    alias: alias!,
    issuer: issuer!,
    cardType: cardType!,
    status: status!,
    ...(last4 && { last4 }),
    creditLimit: creditLimit!,
    statementDay: statementDay!,
    dueDayBuffer: dueDayBuffer!,
    color: color!,
    ...(account && { defaultPaidFromAccountId: account }),
    ...(password.trim() !== "" && { statementPdfPassword: password }),
    ...(keywords && { emailMatchKeywords: keywords }),
  });
}

export interface StatementInput {
  cardId: string;
  statementDate: string;
  dueDate: string;
  totalAmountDue: number;
  minimumAmountDue: number;
}

export interface Known {
  cardIds: string[];
  accountIds: string[];
}

/**
 * Add statement, always saved as Pending; paying is Mark paid. The total due can
 * be negative, a credit balance the dashboard counts as ₹0 spend (PRD §8), and
 * the minimum due is never more than the total (so ₹0 with a credit balance).
 */
export function readStatementForm(fields: FormFields, known: Pick<Known, "cardIds">): FormResult<StatementInput> {
  const f = new FieldReader(fields);
  const cardId = f.choice("cardId", known.cardIds, "Choose a card");
  const statementDate = f.date("statementDate", "Choose a statement date");
  const dueDate = f.date("dueDate", "Choose a due date");
  if (statementDate && dueDate && dueDate <= statementDate) f.fail("dueDate", "The due date should be after the statement date");
  const totalAmountDue = f.amount("totalAmountDue", { required: "Enter the total due", allowNegative: true, label: "total due" });
  const minimumAmountDue = f.amount("minimumAmountDue", { required: "Enter the minimum due", label: "minimum due" });
  if (totalAmountDue !== undefined && minimumAmountDue !== undefined && minimumAmountDue > Math.max(0, totalAmountDue)) {
    f.fail("minimumAmountDue", totalAmountDue < 0 ? "With a credit balance, the minimum due is ₹0" : "Minimum due can't be more than the total due");
  }
  return f.result({ cardId: cardId!, statementDate: statementDate!, dueDate: dueDate!, totalAmountDue: totalAmountDue!, minimumAmountDue: minimumAmountDue! });
}

export interface MarkPaidInput {
  amountPaid: number;
  paidDate: string;
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

/**
 * Mark paid: the amount (the form starts it at the total due), the date (starts
 * at today, never in the future or before the statement), and where it came
 * from: a bank account or another card, never both.
 */
export function readMarkPaidForm(fields: FormFields, statement: Pick<Statement, "cardId" | "statementDate">, known: Known, today: string): FormResult<MarkPaidInput> {
  const f = new FieldReader(fields);
  const amountPaid = f.amount("amountPaid", { required: "Enter the amount you paid", label: "amount paid" });
  const paidDate = f.date("paidDate", "Choose the date you paid");
  if (paidDate && paidDate > today) f.fail("paidDate", "The payment date can't be in the future");
  else if (paidDate && paidDate < statement.statementDate) f.fail("paidDate", "The payment date can't be before the statement date");
  const paidFrom = readPaidFrom(f, "paidFrom", known, statement.cardId);
  return f.result({ amountPaid: amountPaid!, paidDate: paidDate!, ...paidFrom });
}

/** A statement already on record for the same card and statement date: almost certainly a duplicate. */
export function findDuplicateStatement<T extends Pick<Statement, "cardId" | "statementDate">>(statements: T[], cardId: string, statementDate: string): T | undefined {
  return statements.find((s) => s.cardId === cardId && s.statementDate === statementDate);
}
