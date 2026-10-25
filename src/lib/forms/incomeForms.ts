import { CARD_COLORS, INCOME_ICONS, type CardColor, type IncomeCategory, type IncomeFrequency, type IncomeIcon, type IncomeSourceStatus, type IncomeTag } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The Income forms (#190, docs/design/income.md "The final design", IncomeZForms): Add and Edit source, and Record
 * income, which is also Mark received (opened on a payment that's owed) and Edit entry. Each one's fields read into
 * what its repository expects, or plain-word errors by field. The wording here is the source of truth.
 */

export const INCOME_CATEGORIES: readonly IncomeCategory[] = ["Salary", "Investment", "Other"];
export const INCOME_FREQUENCIES: readonly IncomeFrequency[] = ["Monthly", "Quarterly", "Yearly", "One-Time"];
export const INCOME_TAGS: readonly IncomeTag[] = ["Regular", "Bonus", "Other"];
const STATUSES: readonly IncomeSourceStatus[] = ["Active", "Inactive"];

export interface SourceInput {
  name: string;
  /** Blank is the name. */
  alias: string;
  category: IncomeCategory;
  frequency: IncomeFrequency;
  expectedAmount: number;
  /** "Next expected": a day it's expected; the schedule counts from it both ways (PRD §8). */
  scheduleDate: string;
  color: CardColor;
  icon?: IncomeIcon;
  /** Blank is none; on an edit "" clears it. */
  accountId: string;
  statementMatch: string;
  status: IncomeSourceStatus;
}

/** Add source, and Edit source when `editing` (which can also mark it inactive). */
export function readSourceForm(fields: FormFields, known: { accountIds: string[] }, editing: boolean): FormResult<SourceInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Enter what pays you, like NetApp Salary");
  const alias = f.text("alias") ?? name ?? "";
  const category = f.choice("category", INCOME_CATEGORIES, "Choose salary, investment or other");
  const frequency = f.choice("frequency", INCOME_FREQUENCIES, "Choose how often it pays");
  const expectedAmount = f.amount("expectedAmount", { required: "Enter what it usually pays", label: "usual amount" });
  if (expectedAmount === 0) f.fail("expectedAmount", "The usual amount has to be more than ₹0");
  const scheduleDate = f.date("scheduleDate", frequency === "One-Time" ? "Enter when it's expected" : "Enter when it's next expected");
  const color = f.choice("color", CARD_COLORS, "Pick a colour");
  const iconText = f.raw("icon").trim();
  const icon = iconText === "" ? undefined : f.choice("icon", INCOME_ICONS, "Pick one of the icons");
  const accountId = f.raw("accountId").trim();
  if (accountId && !known.accountIds.includes(accountId)) f.fail("accountId", "Choose one of your accounts");
  const statementMatch = f.text("statementMatch") ?? "";
  if (statementMatch && statementMatch.replace(/\s+/g, "").length < 3) f.fail("statementMatch", "Use at least 3 letters, like NETAPP, so it doesn't match other deposits");
  const status = editing ? f.choice("status", STATUSES, "Choose active or inactive") : "Active";
  return f.result({
    name: name!,
    alias,
    category: category!,
    frequency: frequency!,
    expectedAmount: expectedAmount!,
    scheduleDate: scheduleDate!,
    color: color!,
    ...(icon && { icon }),
    accountId,
    statementMatch,
    status: status!,
  });
}

export interface EntryInput {
  incomeSourceId: string;
  expectedDate: string;
  receivedDate: string;
  amount: number;
  tag: IncomeTag;
  /** Blank is not recorded; on an edit "" clears it. */
  accountId: string;
}

/** Record income, Mark received and Edit entry: money that landed. It can't be from a day that hasn't come yet. */
export function readEntryForm(fields: FormFields, known: { sourceIds: string[]; accountIds: string[] }, today: string): FormResult<EntryInput> {
  const f = new FieldReader(fields);
  const incomeSourceId = f.choice("incomeSourceId", known.sourceIds, "Choose where it came from");
  const receivedDate = f.date("receivedDate", "Enter the day it landed");
  if (receivedDate && receivedDate > today) f.fail("receivedDate", "It can't have landed on a day that hasn't come yet. Pending payments are worked out for you");
  // Blank is the day it landed: a one-off, or money with no fixed day.
  const expectedDate = f.date("expectedDate") ?? receivedDate;
  const amount = f.amount("amount", { required: "Enter how much landed", label: "amount" });
  if (amount === 0) f.fail("amount", "The amount has to be more than ₹0");
  const tag = f.choice("tag", INCOME_TAGS, "Choose regular, bonus or one-off");
  const accountId = f.raw("accountId").trim();
  if (accountId && !known.accountIds.includes(accountId)) f.fail("accountId", "Choose one of your accounts");
  return f.result({ incomeSourceId: incomeSourceId!, expectedDate: expectedDate!, receivedDate: receivedDate!, amount: amount!, tag: tag!, accountId });
}
