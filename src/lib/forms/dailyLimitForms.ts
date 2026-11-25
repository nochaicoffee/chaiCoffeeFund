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

/** The prefix of a category's limit field: `category-limit:food`. */
export const CATEGORY_LIMIT_FIELD = "category-limit:";

export interface LimitsInput {
  month: string;
  /** The monthly limit, or null when its box was left blank: the monthly limit is then left as it is. */
  limit: number | null;
  /** A positive limit per category, or null for none. Only the categories the form carried a field for. */
  categories: Record<string, number | null>;
}

/**
 * Set the monthly limit (left alone when blank) and, optionally, a limit per category, from a month on (docs/design/daily.md, round 6, L1). A category's box left blank, or 0, means
 * no limit for it. `known` is every category there is, hidden ones included; a field for one that isn't there is refused.
 */
export function readLimitsForm(fields: FormFields, known: readonly string[]): FormResult<LimitsInput> {
  // A blank monthly box leaves the monthly limit as it is, so category limits can be set without one.
  const f = new FieldReader(fields);
  const blankMonthly = f.raw("limit").trim() === "";
  const monthText = f.raw("month").trim();
  const monthly = blankMonthly ? ({ ok: true, input: { month: monthText, limit: null } } as const) : readLimitForm(fields);
  if (blankMonthly && !MONTH.test(monthText)) f.fail("month", "That isn't a month");
  const categories: Record<string, number | null> = {};
  for (const name of Object.keys(fields).filter((k) => k.startsWith(CATEGORY_LIMIT_FIELD))) {
    const id = name.slice(CATEGORY_LIMIT_FIELD.length);
    if (!known.includes(id)) {
      f.fail(name, "That category isn't there any more");
      continue;
    }
    const value = f.amount(name, { label: "limit" });
    if (value !== undefined && value > 10_000_000) f.fail(name, "That's more than a month's spending could be");
    categories[id] = value === undefined || value === 0 ? null : value;
  }
  if (!monthly.ok || !f.ok) return { ok: false, errors: { ...f.errors, ...(monthly.ok ? {} : monthly.errors) } };
  return { ok: true, input: { ...monthly.input, categories } };
}
