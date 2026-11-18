import { FieldReader, type FormFields, type FormResult } from "./fields";

/** Set the monthly limit (docs/design/daily.md, round 3): from this month on, until it's changed. */
export interface LimitInput {
  month: string;
  limit: number;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function readLimitForm(fields: FormFields): FormResult<LimitInput> {
  const f = new FieldReader(fields);
  const month = f.raw("month").trim();
  if (!MONTH.test(month)) f.fail("month", "That isn't a month");
  const limit = f.amount("limit", { required: "Enter the most you want to spend in a month", label: "limit" });
  if (limit === 0) f.fail("limit", "The limit has to be more than ₹0");
  if (limit !== undefined && limit > 10_000_000) f.fail("limit", "That's more than a month's spending could be");
  if (!f.ok || limit === undefined) return { ok: false, errors: f.errors };
  return { ok: true, input: { month, limit } };
}
