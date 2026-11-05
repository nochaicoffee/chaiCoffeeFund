import { describe, expect, it } from "vitest";
import type { EpfEntry } from "../sheets/types";
import { readContributionForm, readCreditedForm, readSettingsForm } from "./epfForms";

const TODAY = "2026-11-05";
const entry = (e: Partial<EpfEntry> & Pick<EpfEntry, "kind" | "date">): EpfEntry => ({ id: "e1", epfAccountId: "acc", employee: 100, employer: 100, pension: 0, source: "Passbook", ...e });
const known = (entries: EpfEntry[] = [], editingId?: string) => ({ accountIds: ["acc"], entries, editingId });

describe("readContributionForm", () => {
  const good = { epfAccountId: "acc", wageMonth: "2026-10", date: "2026-11-03", employee: "19,654", employer: "19,654" };
  it("reads a credit, with no pension share unless given", () => {
    expect(readContributionForm(good, known(), TODAY)).toEqual({ ok: true, input: { epfAccountId: "acc", kind: "Contribution", wageMonth: "2026-10", date: "2026-11-03", employee: 19654, employer: 19654, pension: 0 } });
    const withPension = readContributionForm({ ...good, pension: "1,250" }, known(), TODAY);
    expect(withPension.ok && withPension.input.pension).toBe(1250);
  });
  it("says what's wrong in plain words, by field", () => {
    const bad = (change: object) => {
      const r = readContributionForm({ ...good, ...change }, known(), TODAY);
      return r.ok ? {} : r.errors;
    };
    expect(bad({ wageMonth: "" }).wageMonth).toBe("Choose the wage month it is for");
    expect(bad({ wageMonth: "October" }).wageMonth).toBe("Choose the wage month it is for");
    expect(bad({ date: "" }).date).toBe("Enter the day it was credited");
    expect(bad({ date: "2026-11-30" }).date).toMatch(/hasn't come yet/);
    expect(bad({ date: "2026-10-31" }).date).toBe("A credit comes after the month its wages were for");
    expect(bad({ employee: "" }).employee).toBe("Enter the employee's share");
    expect(bad({ employee: "0", employer: "0" }).employee).toBe("A credit of nothing records nothing");
    expect(bad({ employer: "-5" }).employer).toMatch(/can't be negative/);
    expect(bad({ epfAccountId: "other" }).epfAccountId).toBe("Choose the EPF account");
  });
  it("refuses a second credit for a wage month, but not the one being edited", () => {
    const stored = entry({ kind: "Contribution", wageMonth: "2026-10", date: "2026-11-03" });
    expect(readContributionForm(good, known([stored]), TODAY)).toMatchObject({ ok: false, errors: { wageMonth: expect.stringMatching(/already a credit for the wage month 2026-10/) } });
    expect(readContributionForm(good, known([stored], "e1"), TODAY).ok).toBe(true);
  });
});

describe("readCreditedForm", () => {
  const interest = { epfAccountId: "acc", kind: "Interest", financialYear: "2025-26", employee: "20,462", employer: "20,462" };
  it("reads a year's interest, dated 31 March of the year's end", () => {
    expect(readCreditedForm(interest, known(), TODAY)).toEqual({ ok: true, input: { epfAccountId: "acc", kind: "Interest", date: "2026-03-31", employee: 20462, employer: 20462, pension: 0 } });
  });
  it("refuses interest for a year that hasn't ended, a year that isn't one, and a second for the same year", () => {
    expect(readCreditedForm({ ...interest, financialYear: "2026-27" }, known(), TODAY)).toMatchObject({ errors: { financialYear: expect.stringMatching(/hasn't ended/) } });
    expect(readCreditedForm({ ...interest, financialYear: "2025-27" }, known(), TODAY)).toMatchObject({ errors: { financialYear: "Choose the financial year, like 2025-26" } });
    const stored = entry({ kind: "Interest", date: "2026-03-31" });
    expect(readCreditedForm(interest, known([stored]), TODAY)).toMatchObject({ errors: { financialYear: expect.stringMatching(/already recorded/) } });
    expect(readCreditedForm(interest, known([stored], "e1"), TODAY).ok).toBe(true);
  });
  it("reads an opening balance as at a day, once for an account", () => {
    const opening = { epfAccountId: "acc", kind: "Opening", date: "2025-03-31", employee: "1,00,000", employer: "1,00,000" };
    expect(readCreditedForm(opening, known(), TODAY)).toMatchObject({ ok: true, input: { kind: "Opening", date: "2025-03-31", employee: 100000 } });
    expect(readCreditedForm({ ...opening, date: "2027-01-01" }, known(), TODAY)).toMatchObject({ errors: { date: "That day hasn't come yet" } });
    expect(readCreditedForm(opening, known([entry({ kind: "Opening", date: "2020-03-31" })]), TODAY)).toMatchObject({ errors: { date: expect.stringMatching(/already has an opening balance/) } });
    expect(readCreditedForm({ ...opening, employee: "0", employer: "0" }, known(), TODAY)).toMatchObject({ errors: { employee: "An opening balance of nothing records nothing" } });
  });
  it("needs to be told which", () => {
    expect(readCreditedForm({ ...interest, kind: "" }, known(), TODAY)).toMatchObject({ errors: { kind: "Choose interest or an opening balance" } });
  });
});

describe("readSettingsForm", () => {
  const ctx = { accountIds: ["acc"], editableYears: ["2025-26", "2026-27"] };
  it("reads a rate for each editable year, and the monthly credit", () => {
    const r = readSettingsForm({ epfAccountId: "acc", "rate:2025-26": "", "source:2025-26": "Assumed", "rate:2026-27": "8.5", "source:2026-27": "Declared", projectionCredit: "39,308" }, ctx);
    expect(r).toEqual({ ok: true, input: { epfAccountId: "acc", projectionCredit: 39308, rates: [{ financialYear: "2026-27", ratePercent: 8.5, source: "Declared" }], cleared: ["2025-26"] } });
  });
  it("a blank monthly credit clears it", () => {
    const r = readSettingsForm({ epfAccountId: "acc", "rate:2026-27": "8.25", "source:2026-27": "Assumed", projectionCredit: "" }, ctx);
    expect(r.ok && r.input.projectionCredit).toBeUndefined();
  });
  it("refuses a rate that isn't a percentage, or one with no source", () => {
    const bad = (fields: object) => {
      const r = readSettingsForm({ epfAccountId: "acc", "rate:2026-27": "8.25", "source:2026-27": "Assumed", ...fields }, ctx);
      return r.ok ? {} : r.errors;
    };
    expect(bad({ "rate:2026-27": "85" })["rate:2026-27"]).toBe("A rate is a percentage a year, like 8.25");
    expect(bad({ "rate:2026-27": "0" })["rate:2026-27"]).toBe("A rate is a percentage a year, like 8.25");
    expect(bad({ "rate:2026-27": "abc" })["rate:2026-27"]).toMatch(/as an amount/);
    expect(bad({ "source:2026-27": "Implied" })["source:2026-27"]).toBe("Choose declared or assumed");
    expect(bad({ projectionCredit: "0" }).projectionCredit).toMatch(/monthly credit/);
  });
});
