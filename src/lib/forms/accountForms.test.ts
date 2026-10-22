import { describe, expect, it } from "vitest";
import { readCloseForm, readAccountForm, readBalanceForm, readCheckInForm, readEditBalanceForm } from "./accountForms";

const good = { name: "HDFC Salary", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2026-01-05", color: "Sapphire", last4: "0042", balance: "1,20,000" };

describe("readAccountForm", () => {
  it("reads an add, with the opening balance and a last 4 that keeps its leading zero", () => {
    const r = readAccountForm(good, false);
    expect(r).toEqual({ ok: true, input: { name: "HDFC Salary", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2026-01-05", color: "Sapphire", last4: "0042", balance: 120000 } });
  });
  it("leaves last 4 and the balance optional, and ignores a balance on an edit", () => {
    const r = readAccountForm({ ...good, last4: "", balance: "" }, false);
    expect(r.ok && r.input.last4).toBe("");
    expect(r.ok && "balance" in r.input).toBe(false);
    const edit = readAccountForm(good, true);
    expect(edit.ok && "balance" in edit.input).toBe(false);
  });
  it("says what's wrong in plain words, by field", () => {
    const r = readAccountForm({ ...good, name: "", purpose: "x", last4: "12", startDate: "2026-02-30" }, false);
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["last4", "name", "purpose", "startDate"]);
  });
  it("won't take a negative opening balance", () => {
    expect(readAccountForm({ ...good, balance: "-5" }, false).ok).toBe(false);
  });
});

describe("readBalanceForm", () => {
  const known = { accountIds: ["a1"] };
  it("reads a balance, which may be negative", () => {
    expect(readBalanceForm({ accountId: "a1", date: "2026-10-20", balance: "-2,500.50" }, known, "2026-10-22")).toEqual({ ok: true, input: { accountId: "a1", date: "2026-10-20", balance: -2500.5 } });
  });
  it("refuses an unknown account, a future day and a blank balance", () => {
    const r = readBalanceForm({ accountId: "zz", date: "2026-10-23", balance: "" }, known, "2026-10-22");
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["accountId", "balance", "date"]);
  });
  it("takes today", () => {
    expect(readBalanceForm({ accountId: "a1", date: "2026-10-22", balance: "0" }, known, "2026-10-22").ok).toBe(true);
  });
});

describe("readEditBalanceForm", () => {
  it("reads the day and amount", () => {
    expect(readEditBalanceForm({ id: "s1", date: "2026-10-01", balance: "5000" }, "2026-10-22")).toEqual({ ok: true, input: { id: "s1", date: "2026-10-01", balance: 5000 } });
  });
});

describe("readCheckInForm", () => {
  const known = { accountIds: ["a1", "a2", "a3"] };
  it("takes the balances typed and leaves blank ones alone", () => {
    const r = readCheckInForm({ date: "2026-10-22", "balance:a1": "100", "balance:a2": "", "balance:a3": "0" }, known, "2026-10-22");
    expect(r).toEqual({ ok: true, input: { date: "2026-10-22", balances: [{ accountId: "a1", balance: 100 }, { accountId: "a3", balance: 0 }] } });
  });
  it("needs at least one, and names the account whose balance isn't an amount", () => {
    const none = readCheckInForm({ date: "2026-10-22" }, known, "2026-10-22");
    expect(!none.ok && none.errors.form).toBeDefined();
    const bad = readCheckInForm({ date: "2026-10-22", "balance:a2": "abc" }, known, "2026-10-22");
    expect(!bad.ok && Object.keys(bad.errors)).toEqual(["balance:a2"]);
  });
});

describe("readCloseForm", () => {
  it("takes the day it closed", () => {
    expect(readCloseForm({ endDate: "2026-10-22" }, "2026-10-20", "2026-10-22")).toEqual({ ok: true, input: { endDate: "2026-10-22" } });
    expect(readCloseForm({ endDate: "2026-10-20" }, "2026-10-20", "2026-10-22").ok).toBe(true);
  });
  it("refuses a day before its latest balance, a future day and a bad date, with the error on the date", () => {
    for (const endDate of ["2026-10-01", "2026-10-23", "tomorrow", ""]) {
      const r = readCloseForm({ endDate }, "2026-10-20", "2026-10-22");
      expect(!r.ok && Object.keys(r.errors)).toEqual(["endDate"]);
    }
  });
  it("takes any day up to today when it has no balance yet", () => {
    expect(readCloseForm({ endDate: "2020-01-01" }, null, "2026-10-22").ok).toBe(true);
  });
});
