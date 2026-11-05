import { describe, expect, it } from "vitest";
import { accountInUse, entryConflict, missingAccount, rateConflict } from "./epfRules";
import type { EpfEntry, EpfRate } from "./types";

const entry = (o: Partial<EpfEntry> & { id: string }): EpfEntry => ({ epfAccountId: "a1", kind: "Contribution", date: "2026-10-18", wageMonth: "2026-09", employee: 1, employer: 1, pension: 0, source: "Typed", ...o });
const rate = (o: Partial<EpfRate> & { id: string }): EpfRate => ({ epfAccountId: "a1", financialYear: "2026-27", ratePercent: 8.25, source: "Assumed", ...o });
const newCredit: Omit<EpfEntry, "id"> = (() => { const e: Partial<EpfEntry> = entry({ id: "x" }); delete e.id; return e as Omit<EpfEntry, "id">; })();

describe("entryConflict", () => {
  const existing = [entry({ id: "c1" }), entry({ id: "i1", kind: "Interest", date: "2026-03-31", wageMonth: undefined }), entry({ id: "o1", kind: "Opening", date: "2026-03-31", wageMonth: undefined })];
  it("refuses a second credit for a wage month on the same account, whatever day it is credited", () => {
    expect(entryConflict(existing, { ...newCredit, date: "2026-10-20" })).toMatch(/already a credit for the wage month 2026-09/);
  });
  it("allows the same wage month on another account, and another wage month on this one", () => {
    expect(entryConflict(existing, { ...newCredit, epfAccountId: "a2" })).toBeNull();
    expect(entryConflict(existing, { ...newCredit, wageMonth: "2026-10", date: "2026-11-18" })).toBeNull();
  });
  it("refuses a second year's interest for a financial year, and a second opening balance", () => {
    const interest = { ...newCredit, kind: "Interest" as const, wageMonth: undefined, date: "2026-03-31" };
    expect(entryConflict(existing, interest)).toMatch(/interest for 2025-26 is already recorded/);
    expect(entryConflict(existing, { ...interest, date: "2027-03-31" })).toBeNull();
    expect(entryConflict(existing, { ...newCredit, kind: "Opening", wageMonth: undefined })).toMatch(/already has an opening balance/);
  });
  it("ignores the row being changed, so saving a credit again doesn't collide with itself", () => {
    expect(entryConflict(existing, { ...newCredit, employee: 5 }, "c1")).toBeNull();
  });
  it("sees a collision a change causes: moving a credit into a wage month that has one", () => {
    const two = [entry({ id: "c1" }), entry({ id: "c2", wageMonth: "2026-08", date: "2026-09-17" })];
    expect(entryConflict(two, { ...newCredit, wageMonth: "2026-09" }, "c2")).toMatch(/already a credit/);
  });
});

describe("rateConflict", () => {
  it("allows one rate for each account and year", () => {
    const existing = [rate({ id: "r1" })];
    expect(rateConflict(existing, { epfAccountId: "a1", financialYear: "2026-27", ratePercent: 8.5, source: "Declared" })).toMatch(/already a rate for 2026-27/);
    expect(rateConflict(existing, { epfAccountId: "a1", financialYear: "2027-28", ratePercent: 8.5, source: "Declared" })).toBeNull();
    expect(rateConflict(existing, { epfAccountId: "a2", financialYear: "2026-27", ratePercent: 8.5, source: "Declared" })).toBeNull();
    expect(rateConflict(existing, { epfAccountId: "a1", financialYear: "2026-27", ratePercent: 8.5, source: "Declared" }, "r1")).toBeNull();
  });
});

describe("missingAccount and accountInUse", () => {
  it("needs the account to exist", () => {
    expect(missingAccount([{ id: "a1" }], "a1")).toBeNull();
    expect(missingAccount([{ id: "a1" }], "gone")).toBe("That EPF account doesn't exist");
  });
  it("refuses to delete an account that still has entries or rates, and says how many", () => {
    expect(accountInUse([], [], "a1")).toBeNull();
    expect(accountInUse([{ epfAccountId: "a1" }, { epfAccountId: "a1" }], [{ epfAccountId: "a1" }], "a1")).toBe("This account still has 2 entries and 1 rate: delete those first");
    expect(accountInUse([{ epfAccountId: "a2" }], [], "a1")).toBeNull();
  });
});
