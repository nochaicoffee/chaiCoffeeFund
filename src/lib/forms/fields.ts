import { ISO_DATE_PATTERN } from "../format/date";
import { parseAmountText } from "../format/money";

/**
 * Reading the fields of a submitted form, with errors in plain words next to the
 * field they belong to (#51). The forms validate here before anything is sent to
 * the Sheet; the entity's zod schema still checks the result as a last guard.
 */

/** A submitted form's fields as text, e.g. Object.fromEntries(formData). */
export type FormFields = Record<string, FormDataEntryValue | undefined>;

/** Field name → what's wrong with it, in plain words. */
export type FieldErrors = Record<string, string>;

export type FormResult<T> = { ok: true; input: T } | { ok: false; errors: FieldErrors };

/** Collects field errors while a form is read; each field keeps its first error. */
export class FieldReader {
  readonly errors: FieldErrors = {};

  constructor(private readonly fields: FormFields) {}

  /** A field's text as typed, or "" when it's missing (or isn't text). */
  raw(name: string): string {
    const value = this.fields[name];
    return typeof value === "string" ? value : "";
  }

  fail(name: string, message: string): void {
    this.errors[name] ??= message;
  }

  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  /** Trimmed text, or undefined when blank. A required blank field gets `requiredMessage`. */
  text(name: string, requiredMessage?: string): string | undefined {
    const value = this.raw(name).trim();
    if (value !== "") return value;
    if (requiredMessage) this.fail(name, requiredMessage);
    return undefined;
  }

  /** One of `options`, or undefined (with `message`) when it's blank or anything else. */
  choice<T extends string>(name: string, options: readonly T[], message: string): T | undefined {
    const value = this.raw(name).trim();
    if ((options as readonly string[]).includes(value)) return value as T;
    this.fail(name, message);
    return undefined;
  }

  /** An ISO date (from DateInput, which sends what was typed when it isn't one), or undefined when blank or unreadable. */
  date(name: string, requiredMessage?: string): string | undefined {
    const value = this.raw(name).trim();
    if (value === "") {
      if (requiredMessage) this.fail(name, requiredMessage);
      return undefined;
    }
    // The round trip catches dates that don't exist: JS reads 2026-02-30 as 2 Mar.
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!ISO_DATE_PATTERN.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      this.fail(name, "Enter a date, like 5 Aug 2026");
      return undefined;
    }
    return value;
  }

  /**
   * An amount as typed ("1,20,000", "₹38,500.50"), or undefined when blank or
   * unreadable. Negative amounts are refused unless `allowNegative`.
   */
  amount(name: string, opts: { required?: string; allowNegative?: boolean; label: string }): number | undefined {
    const text = this.raw(name).trim();
    if (text === "") {
      if (opts.required) this.fail(name, opts.required);
      return undefined;
    }
    const value = parseAmountText(text);
    if (value === null) {
      this.fail(name, `Enter the ${opts.label} as an amount, like 38,500`);
      return undefined;
    }
    if (value < 0 && !opts.allowNegative) {
      this.fail(name, `The ${opts.label} can't be negative`);
      return undefined;
    }
    return Math.round(value * 100) / 100;
  }

  /** A whole number between `min` and `max`, or undefined (with `message`) when it's blank or outside them. */
  integer(name: string, opts: { min: number; max: number; message: string }): number | undefined {
    const text = this.raw(name).trim();
    const value = Number(text);
    if (text !== "" && Number.isInteger(value) && value >= opts.min && value <= opts.max) return value;
    this.fail(name, opts.message);
    return undefined;
  }

  result<T>(input: T): FormResult<T> {
    return this.ok ? { ok: true, input } : { ok: false, errors: this.errors };
  }
}

/**
 * Where a payment came from, as one form value: "account:<id>" or "card:<id>",
 * so a payment can name a bank account or a card but never both (as the data
 * model requires). Blank means not recorded.
 */
export function readPaidFrom(
  reader: FieldReader,
  name: string,
  known: { accountIds: string[]; cardIds: string[] },
  payingCardId?: string,
): { paidFromAccountId?: string; paidFromCardId?: string } {
  const value = reader.raw(name).trim();
  if (value === "") return {};
  const [kind, id] = [value.slice(0, value.indexOf(":")), value.slice(value.indexOf(":") + 1)];
  if (kind === "account" && known.accountIds.includes(id)) return { paidFromAccountId: id };
  if (kind === "card" && known.cardIds.includes(id)) {
    if (id === payingCardId) {
      reader.fail(name, "A card can't pay its own bill: choose the account or card it was paid from");
      return {};
    }
    return { paidFromCardId: id };
  }
  reader.fail(name, "Choose the account or card it was paid from");
  return {};
}
