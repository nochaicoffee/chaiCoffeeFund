import { describe, expect, it } from "vitest";
import type { Account } from "../sheets/types";
import { readTransferForm, transferAccounts, transferMoney } from "./transferForm";

const account = (id: string, name: string, extra: Partial<Account> = {}): Account => ({ id, name, bank: name, accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active", ...extra }) as Account;
const accounts = transferAccounts([
  account("hdfc", "HDFC Bank Account"),
  account("sbi", "SBI", { status: "Inactive" }),
  account("ind", "IND Money - Prathik", { accountType: "Brokerage", purpose: "Investment", currency: "USD" }),
  account("zer", "Zerodha", { accountType: "Brokerage", purpose: "Investment" }),
]);
const ctx = { accounts, transfers: [{ id: "t1", reference: "UTR123" }], today: "2026-11-13" };
const base = { direction: "out", bank: "hdfc", broker: "zer", date: "2026-11-01", amount: "1,00,000", receivedAmount: "", reference: "" };

describe("transferAccounts", () => {
  it("lists rupee banks and brokerage accounts apart, with closed ones flagged", () => {
    expect(accounts.banks.map((a) => a.id)).toEqual(["hdfc", "sbi"]);
    expect(accounts.banks.find((a) => a.id === "sbi")?.closed).toBe(true);
    expect(accounts.brokers.map((a) => a.id)).toEqual(["ind", "zer"]);
  });
});

describe("transferMoney", () => {
  it("says which money leaves and which arrives, either way", () => {
    expect(transferMoney("out", accounts.brokers[0])).toEqual({ left: "INR", arrived: "USD" });
    expect(transferMoney("back", accounts.brokers[0])).toEqual({ left: "USD", arrived: "INR" });
  });
});

describe("readTransferForm", () => {
  it("reads money sent to a rupee broker: bank to broker, no received amount", () => {
    expect(readTransferForm(base, ctx)).toEqual({ ok: true, input: { date: "2026-11-01", fromAccountId: "hdfc", toAccountId: "zer", amount: 100000, source: "Manual" } });
  });

  it("reads money back from a broker the other way round", () => {
    const result = readTransferForm({ ...base, direction: "back" }, ctx);
    expect(result).toMatchObject({ ok: true, input: { fromAccountId: "zer", toAccountId: "hdfc", amount: 100000 } });
  });

  it("needs the dollars that arrived for a US broker, and keeps them", () => {
    const missing = readTransferForm({ ...base, broker: "ind" }, ctx);
    expect(missing).toMatchObject({ ok: false, errors: { receivedAmount: "Enter how many dollars arrived" } });
    expect(readTransferForm({ ...base, broker: "ind", amount: "90,000", receivedAmount: "1,000" }, ctx)).toMatchObject({ ok: true, input: { amount: 90000, receivedAmount: 1000 } });
  });

  it("takes dollars as the amount and asks for rupees when a US broker sends money back", () => {
    expect(readTransferForm({ ...base, direction: "back", broker: "ind", amount: "500" }, ctx)).toMatchObject({ ok: false, errors: { receivedAmount: "Enter how many rupees arrived" } });
    expect(readTransferForm({ ...base, direction: "back", broker: "ind", amount: "500", receivedAmount: "44,000" }, ctx)).toMatchObject({ ok: true, input: { fromAccountId: "ind", toAccountId: "hdfc", amount: 500, receivedAmount: 44000 } });
  });

  it("ignores a received amount typed for the same money", () => {
    expect(readTransferForm({ ...base, receivedAmount: "5" }, ctx)).toMatchObject({ ok: true, input: { amount: 100000 } });
    expect(readTransferForm({ ...base, receivedAmount: "5" }, ctx)).not.toHaveProperty("input.receivedAmount");
  });

  it("explains each blank in words", () => {
    const result = readTransferForm({ direction: "out" }, ctx);
    expect(result).toMatchObject({ ok: false, errors: { bank: "Choose the bank account", broker: "Choose the broker", date: "Enter the date it moved", amount: "Enter how much left" } });
  });

  it("refuses a day that hasn't come, a zero amount, a closed account and a reference already recorded", () => {
    expect(readTransferForm({ ...base, date: "2026-11-14" }, ctx)).toMatchObject({ errors: { date: "That day hasn't come yet" } });
    expect(readTransferForm({ ...base, amount: "0" }, ctx)).toMatchObject({ errors: { amount: "Enter an amount above zero" } });
    expect(readTransferForm({ ...base, bank: "sbi" }, ctx)).toMatchObject({ errors: { bank: "Choose the bank account" } });
    expect(readTransferForm({ ...base, reference: "utr123" }, ctx)).toMatchObject({ errors: { reference: "A transfer with this reference is already recorded" } });
  });

  it("keeps the reference when it is new", () => {
    expect(readTransferForm({ ...base, reference: " UTR999 " }, ctx)).toMatchObject({ ok: true, input: { reference: "UTR999" } });
  });

  it("lets an edit keep its own closed account and its own reference, but not take another's", () => {
    const editing = { id: "t1", fromAccountId: "sbi", toAccountId: "zer" };
    expect(readTransferForm({ ...base, bank: "sbi", reference: "UTR123" }, { ...ctx, editing })).toMatchObject({ ok: true, input: { fromAccountId: "sbi", reference: "UTR123" } });
    expect(readTransferForm({ ...base, bank: "sbi" }, ctx)).toMatchObject({ ok: false });
    expect(readTransferForm({ ...base, reference: "UTR123" }, { ...ctx, transfers: [...ctx.transfers, { id: "t2", reference: "UTR9" }], editing: { id: "t2", fromAccountId: "hdfc", toAccountId: "zer" } })).toMatchObject({ errors: { reference: "A transfer with this reference is already recorded" } });
  });
});
