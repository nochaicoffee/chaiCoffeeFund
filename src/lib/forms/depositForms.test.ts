import { describe, expect, it } from "vitest";
import { defaultDepositName, readCloseForm, readDepositForm } from "./depositForms";

const TODAY = "2026-11-05";
const known = { accountIds: ["hdfc"] };
const add = { principalAmount: "15,000", interestRate: "7.75", startDate: "2026-11-01", tenureMonths: "18", tenureDays: "1", compoundingType: "Cumulative" };
const errorsOf = (fields: object) => {
  const r = readDepositForm({ ...add, ...fields }, known, TODAY);
  return r.ok ? {} : r.errors;
};

describe("readDepositForm", () => {
  it("reads a deposit as his app shows it: the day it started and how long it runs", () => {
    expect(readDepositForm(add, known, TODAY)).toEqual({
      ok: true,
      input: { name: "Fixed deposit · Nov 1, 2026", principalAmount: 15000, interestRate: 7.75, compoundingType: "Cumulative", startDate: "2026-11-01", maturityDate: "2028-05-02", accountId: "" },
    });
  });
  it("takes the day it matures instead of a tenure", () => {
    const r = readDepositForm({ ...add, tenureMonths: "", tenureDays: "", maturityDate: "2028-05-02" }, known, TODAY);
    expect(r.ok && r.input.maturityDate).toBe("2028-05-02");
  });
  it("keeps the optional bank, maturity amount, account and name", () => {
    const r = readDepositForm({ ...add, bankName: "HDFC", maturityAmount: "17,400", accountId: "hdfc", name: "My FD" }, known, TODAY);
    expect(r).toMatchObject({ ok: true, input: { name: "My FD", bankName: "HDFC", maturityAmount: 17400, accountId: "hdfc" } });
    expect(defaultDepositName("HDFC", "2026-11-01")).toBe("HDFC · Nov 1, 2026");
  });
  it("a paid-out deposit says how often", () => {
    expect(errorsOf({ compoundingType: "Non-Cumulative" }).payoutFrequency).toBe("Choose how often the interest is paid out");
    const r = readDepositForm({ ...add, compoundingType: "Non-Cumulative", payoutFrequency: "Quarterly" }, known, TODAY);
    expect(r.ok && r.input.payoutFrequency).toBe("Quarterly");
    const cumulative = readDepositForm({ ...add, payoutFrequency: "Quarterly" }, known, TODAY);
    expect(cumulative.ok && cumulative.input.payoutFrequency).toBeUndefined();
  });
  it("says what's wrong in plain words, by field", () => {
    expect(errorsOf({ principalAmount: "" }).principalAmount).toBe("Enter the amount placed");
    expect(errorsOf({ principalAmount: "0" }).principalAmount).toMatch(/more than ₹0/);
    expect(errorsOf({ interestRate: "" }).interestRate).toBe("Enter the rate a year");
    expect(errorsOf({ interestRate: "775" }).interestRate).toMatch(/percentage a year/);
    expect(errorsOf({ startDate: "" }).startDate).toBe("Enter the day it started");
    expect(errorsOf({ startDate: "2026-12-01" }).startDate).toMatch(/hasn't come yet/);
    expect(errorsOf({ tenureMonths: "1.5" }).tenureMonths).toBe("Enter the months it runs for, like 18");
    expect(errorsOf({ tenureMonths: "1e2" }).tenureMonths).toBe("Enter the months it runs for, like 18");
    expect(errorsOf({ tenureMonths: "0x10" }).tenureMonths).toBe("Enter the months it runs for, like 18");
    expect(errorsOf({ tenureDays: "-1" }).tenureDays).toBe("Enter the days it runs for, like 1");
    expect(errorsOf({ tenureMonths: "", tenureDays: "" }).tenureMonths).toBe("Say how long it runs: months and days, or the day it matures");
    expect(errorsOf({ tenureMonths: "0", tenureDays: "x" }).tenureDays).toBe("Enter the days it runs for, like 1");
    expect(errorsOf({ tenureMonths: "", tenureDays: "", maturityDate: "2026-10-01" }).maturityDate).toBe("It has to mature after the day it started");
    expect(errorsOf({ maturityAmount: "14,000" }).maturityAmount).toMatch(/less than the amount placed/);
    expect(errorsOf({ accountId: "other" }).accountId).toBe("Choose one of your accounts");
    expect(errorsOf({ compoundingType: "" }).compoundingType).toMatch(/added to it or paid out/);
  });
});

describe("readCloseForm", () => {
  const deposit = { startDate: "2026-03-13", maturityDate: "2027-09-14" };
  it("a deposit closed on or after its maturity day matured, before it was closed early", () => {
    expect(readCloseForm({ receivedAmount: "17,400", closedDate: "2026-11-05" }, { ...deposit, maturityDate: "2026-11-05" }, TODAY)).toEqual({ ok: true, input: { closedDate: "2026-11-05", receivedAmount: 17400, closeKind: "Matured" } });
    expect(readCloseForm({ receivedAmount: "15,900", closedDate: "2026-11-05" }, deposit, TODAY)).toMatchObject({ ok: true, input: { closeKind: "Pre-closed" } });
  });
  it("refuses a day that hasn't come, one before it started, and a missing or zero amount", () => {
    const err = (fields: object) => {
      const r = readCloseForm({ receivedAmount: "15,000", closedDate: "2026-11-05", ...fields }, deposit, TODAY);
      return r.ok ? {} : r.errors;
    };
    expect(err({ closedDate: "2026-11-30" }).closedDate).toMatch(/hasn't come yet/);
    expect(err({ closedDate: "2026-03-01" }).closedDate).toBe("It can't close before it started");
    expect(err({ closedDate: "" }).closedDate).toBe("Enter the day the money arrived");
    expect(err({ receivedAmount: "" }).receivedAmount).toBe("Enter the money that reached your account");
    expect(err({ receivedAmount: "0" }).receivedAmount).toMatch(/more than ₹0/);
  });
});
