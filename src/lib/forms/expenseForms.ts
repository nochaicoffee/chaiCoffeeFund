import { BIG_SPEND_CATEGORIES, type BigSpendCategory } from "../sheets/types";
import { FieldReader, readPaidFrom, type FormFields, type FormResult } from "./fields";

/** Add or edit a big spend (docs/design/expenses.md, "Big spends"): what it was, the day, the amount, a category, and what paid for it. */
export interface BigSpendInput {
  date: string;
  amount: number;
  name: string;
  category: BigSpendCategory;
  paidFromAccountId?: string;
  paidFromCardId?: string;
  note?: string;
}

export function readBigSpendForm(fields: FormFields, known: { accountIds: string[]; cardIds: string[] }, today: string): FormResult<BigSpendInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Say what it was");
  if (name && name.length > 80) f.fail("name", "Keep it under 80 characters");
  const date = f.date("date", "Enter the day you bought it");
  if (date && date > today) f.fail("date", "It can't be bought on a day that hasn't come yet");
  const amount = f.amount("amount", { required: "Enter what it cost", label: "amount" });
  if (amount === 0) f.fail("amount", "The amount has to be more than ₹0");
  const category = f.choice("category", BIG_SPEND_CATEGORIES, "Choose a category");
  const paidFrom = readPaidFrom(f, "paidFrom", known);
  const note = f.text("note");
  if (!f.ok || !name || !date || amount === undefined || !category) return { ok: false, errors: f.errors };
  return { ok: true, input: { date, amount, name, category, ...paidFrom, ...(note && { note }) } };
}
