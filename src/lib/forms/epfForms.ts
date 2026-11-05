import { financialYearEnd } from "../aggregate/epf";
import { EPF_RATE_SOURCES, type EpfEntry, type EpfRateSource } from "../sheets/types";
import { entryConflict } from "../sheets/epfRules";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The EPF forms (#265, docs/design/fixed-income.md, FiForms): Add a contribution, Add what EPFO credited (a year's interest or an
 * opening balance), and EPF settings (a rate for each year and the monthly credit). Each reads its fields into what the repository
 * expects, or plain-word errors by field. Everything these forms write is Typed (ADR 0011); the passbook's rows only come from the import.
 */

export interface KnownEpf {
  accountIds: string[];
  /** Every entry, to catch a second credit for a wage month, a second interest for a year, or a second opening balance. */
  entries: EpfEntry[];
  /** The row being edited, so it doesn't collide with itself. */
  editingId?: string;
}

const WAGE_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface ContributionInput {
  epfAccountId: string;
  kind: "Contribution";
  wageMonth: string;
  date: string;
  employee: number;
  employer: number;
  pension: number;
}

/** Add a contribution, and Edit one. A credit arrives after the month its wages were for, and not on a day that hasn't come. */
export function readContributionForm(fields: FormFields, known: KnownEpf, today: string): FormResult<ContributionInput> {
  const f = new FieldReader(fields);
  const epfAccountId = f.choice("epfAccountId", known.accountIds, "Choose the EPF account");
  const wageMonth = f.text("wageMonth", "Choose the wage month it is for");
  if (wageMonth && !WAGE_MONTH.test(wageMonth)) f.fail("wageMonth", "Choose the wage month it is for");
  const date = f.date("date", "Enter the day it was credited");
  if (date && date > today) f.fail("date", "It can't have been credited on a day that hasn't come yet");
  if (date && wageMonth && WAGE_MONTH.test(wageMonth) && date.slice(0, 7) <= wageMonth) f.fail("date", "A credit comes after the month its wages were for");
  const employee = f.amount("employee", { required: "Enter the employee's share", label: "employee's share" });
  const employer = f.amount("employer", { required: "Enter the employer's share", label: "employer's share" });
  const pension = f.amount("pension", { label: "pension share" }) ?? 0;
  if (employee !== undefined && employer !== undefined && employee + employer + pension === 0) f.fail("employee", "A credit of nothing records nothing");
  if (f.ok) {
    const clash = entryConflict(known.entries, { epfAccountId: epfAccountId!, kind: "Contribution", date: date!, wageMonth, employee: employee!, employer: employer!, pension, source: "Typed" }, known.editingId);
    if (clash) f.fail("wageMonth", clash);
  }
  return f.result({ epfAccountId: epfAccountId!, kind: "Contribution", wageMonth: wageMonth!, date: date!, employee: employee!, employer: employer!, pension });
}

export interface CreditedInput {
  epfAccountId: string;
  kind: "Interest" | "Opening";
  /** A year's interest is credited on 31 March; an opening balance is as at the day given. */
  date: string;
  employee: number;
  employer: number;
  pension: number;
}

const FY = /^(\d{4})-(\d{2})$/;

/** Add what EPFO credited (or Edit it): the interest for a year that has ended, or the balance a first statement starts from. */
export function readCreditedForm(fields: FormFields, known: KnownEpf, today: string): FormResult<CreditedInput> {
  const f = new FieldReader(fields);
  const epfAccountId = f.choice("epfAccountId", known.accountIds, "Choose the EPF account");
  const kind = f.choice("kind", ["Interest", "Opening"] as const, "Choose interest or an opening balance");
  let date: string | undefined;
  if (kind === "Interest") {
    const year = f.text("financialYear", "Choose the financial year");
    const m = year ? FY.exec(year) : null;
    if (year && (!m || Number(m[2]) !== (Number(m[1]) + 1) % 100)) f.fail("financialYear", "Choose the financial year, like 2025-26");
    else if (year) {
      date = financialYearEnd(year);
      if (date > today) f.fail("financialYear", "That year hasn't ended, so its interest hasn't been credited yet");
    }
  } else if (kind === "Opening") {
    date = f.date("date", "Enter the day the balance is as at");
    if (date && date > today) f.fail("date", "That day hasn't come yet");
  }
  const employee = f.amount("employee", { required: "Enter the employee's share", label: "employee's share" });
  const employer = f.amount("employer", { required: "Enter the employer's share", label: "employer's share" });
  const pension = f.amount("pension", { label: "pension share" }) ?? 0;
  if (employee !== undefined && employer !== undefined && employee + employer + pension === 0) f.fail("employee", kind === "Opening" ? "An opening balance of nothing records nothing" : "Interest of nothing records nothing");
  if (f.ok) {
    const clash = entryConflict(known.entries, { epfAccountId: epfAccountId!, kind: kind!, date: date!, employee: employee!, employer: employer!, pension, source: "Typed" }, known.editingId);
    if (clash) f.fail(kind === "Interest" ? "financialYear" : "date", clash);
  }
  return f.result({ epfAccountId: epfAccountId!, kind: kind!, date: date!, employee: employee!, employer: employer!, pension });
}

export interface RateInput {
  financialYear: string;
  ratePercent: number;
  source: EpfRateSource;
}

export interface SettingsInput {
  epfAccountId: string;
  /** Both shares together, for the growth path; undefined clears it (the path then uses the last credit). */
  projectionCredit?: number;
  /** The years given a rate. */
  rates: RateInput[];
  /** The editable years left blank: a rate stored for any of them is removed. */
  cleared: string[];
}

/** EPF settings: a rate for each year that can still be edited (a credited year's rate is worked out from its interest), and the monthly credit. */
export function readSettingsForm(fields: FormFields, known: { accountIds: string[]; editableYears: string[] }): FormResult<SettingsInput> {
  const f = new FieldReader(fields);
  const epfAccountId = f.choice("epfAccountId", known.accountIds, "Choose the EPF account");
  const rates: RateInput[] = [];
  const cleared: string[] = [];
  for (const year of known.editableYears) {
    const field = `rate:${year}`;
    if (f.raw(field).trim() === "") {
      cleared.push(year);
      continue;
    }
    const rate = f.amount(field, { label: `rate for ${year}` });
    if (rate !== undefined && (rate <= 0 || rate > 30)) f.fail(field, "A rate is a percentage a year, like 8.25");
    const source = f.choice(`source:${year}`, EPF_RATE_SOURCES, "Choose declared or assumed");
    if (rate !== undefined && rate > 0 && rate <= 30 && source) rates.push({ financialYear: year, ratePercent: rate, source });
  }
  const credit = f.amount("projectionCredit", { label: "monthly credit" });
  if (credit === 0) f.fail("projectionCredit", "Enter the monthly credit, or leave it blank to use the last one");
  return f.result({ epfAccountId: epfAccountId!, ...(credit !== undefined && { projectionCredit: credit }), rates, cleared });
}
