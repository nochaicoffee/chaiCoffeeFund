import { describe, expect, it } from "vitest";
import type { Account } from "../sheets/types";
import { matchAccount } from "./matchAccount";

const account = (overrides: Partial<Account>): Account => ({ id: "a", name: "Account", bank: "Bank", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active", ...overrides });
const hdfcSalary = account({ id: "hdfc1", name: "HDFC Salary", bank: "HDFC Bank", last4: "0042" });
const hdfcSecond = account({ id: "hdfc2", name: "HDFC Savings", bank: "HDFC Bank", last4: "7788" });
const slice = account({ id: "slice", name: "Slice", bank: "slice small finance bank", last4: "5678" });
const jupiter = account({ id: "jup", name: "Jupiter", bank: "Federal Bank" });
const all = [hdfcSalary, hdfcSecond, slice, jupiter, account({ id: "sbi", name: "SBI", bank: "State Bank of India", last4: "1111" })];

describe("matchAccount", () => {
  it("matches by the bank and the statement's last 4", () => {
    expect(matchAccount(all, "HDFC", "7788")).toEqual({ kind: "match", account: hdfcSecond });
    expect(matchAccount(all, "Slice", "5678")).toEqual({ kind: "match", account: slice });
  });

  it("knows Jupiter's accounts are held at Federal Bank", () => {
    expect(matchAccount(all, "Jupiter", undefined)).toEqual({ kind: "match", account: jupiter });
  });

  it("with two accounts at the bank and no last 4 on the statement, will not pick one", () => {
    const r = matchAccount(all, "HDFC", undefined);
    expect(r.kind).toBe("several");
  });

  it("will not give an HDFC statement to another bank's account, or to an HDFC number that is not one of yours", () => {
    expect(matchAccount([slice], "HDFC", "0042")).toEqual({ kind: "none", reason: "no account is with HDFC" });
    expect(matchAccount(all, "HDFC", "9999")).toEqual({ kind: "none", reason: "a HDFC statement for an account ending 9999, which isn't one of your accounts" });
  });

  it("fills in the last 4 of the bank's only account that has none, from the statement", () => {
    expect(matchAccount(all, "Jupiter", "4321")).toEqual({ kind: "fill-last4", account: jupiter, last4: "4321" });
  });

  it("will not fill a last 4 when two accounts of the bank have none", () => {
    const a = account({ id: "j1", name: "Jupiter A", bank: "Federal Bank" });
    const b = account({ id: "j2", name: "Jupiter B", bank: "Federal Bank" });
    expect(matchAccount([a, b], "Jupiter", "4321").kind).toBe("several");
  });

  it("matches a closed account too, so the caller can say it is closed", () => {
    const closed = { ...slice, status: "Inactive" as const };
    expect(matchAccount([closed], "Slice", "5678")).toEqual({ kind: "match", account: closed });
  });

  it("does not take 'slice' inside another word", () => {
    expect(matchAccount([account({ name: "Pizzaslicer", bank: "Other" })], "Slice", undefined).kind).toBe("none");
  });

  it("will not number an account from a statement in a PDF that holds several, which can't say whose it is", () => {
    const r = matchAccount(all, "Jupiter", "4321", { fillLast4: false });
    expect(r).toMatchObject({ kind: "none" });
    expect(r.kind === "none" && r.reason).toContain("PDF with several accounts");
  });

  it("still matches by last 4 in such a PDF: only filling one in is held back", () => {
    expect(matchAccount(all, "HDFC", "7788", { fillLast4: false })).toEqual({ kind: "match", account: hdfcSecond });
  });
});
