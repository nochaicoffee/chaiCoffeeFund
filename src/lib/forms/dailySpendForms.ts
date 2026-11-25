import { DAILY_SPEND_METHODS, type DailySpendMethod } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/** Add or edit a daily spend (docs/design/daily.md): the day, the amount, UPI, card or cash, and optionally a category (its id) and what it was. */
export interface DailySpendInput {
  date: string;
  amount: number;
  method: DailySpendMethod;
  category?: string;
  note?: string;
}

/** `known.categoryIds` is every category there is, a hidden one included (a spend keeps the one it had). */
export function readDailySpendForm(fields: FormFields, known: { categoryIds: readonly string[] }, today: string): FormResult<DailySpendInput> {
  const f = new FieldReader(fields);
  const date = f.date("date", "Enter the day you spent it");
  if (date && date > today) f.fail("date", "That day hasn't come yet");
  const amount = f.amount("amount", { required: "Enter what you spent", label: "amount" });
  if (amount === 0) f.fail("amount", "The amount has to be more than ₹0");
  const method = f.choice("method", DAILY_SPEND_METHODS, "Choose how you paid");
  // The category is optional: a blank one is fine, one that isn't on the list is not.
  const rawCategory = f.raw("category").trim();
  const category = rawCategory === "" ? undefined : f.choice("category", known.categoryIds, "Choose a category from the list");
  const note = f.text("note");
  if (note && note.length > 80) f.fail("note", "Keep it under 80 characters");
  if (!f.ok || !date || amount === undefined || !method) return { ok: false, errors: f.errors };
  return { ok: true, input: { date, amount, method, ...(category && { category }), ...(note && { note }) } };
}
