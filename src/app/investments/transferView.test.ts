import { describe, expect, it } from "vitest";
import type { Account, Transfer } from "@/lib/sheets/types";
import { TRANSFER_ROWS, transferRows } from "./transferView";

const account = (id: string, name: string, extra: Partial<Account> = {}): Account => ({ id, name, bank: name, accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active", ...extra }) as Account;
const accounts = [account("hdfc", "HDFC"), account("sbi", "SBI"), account("zer", "Zerodha", { accountType: "Brokerage" }), account("ind", "IND Money", { accountType: "Brokerage", currency: "USD" })];
const t = (id: string, date: string, from: string, to: string, amount: number, extra: Partial<Transfer> = {}): Transfer => ({ id, date, fromAccountId: from, toAccountId: to, amount, ...extra });

describe("transferRows", () => {
  it("lists bank and broker transfers newest first, in the money that left", () => {
    const rows = transferRows([t("a", "2026-05-01", "hdfc", "zer", 100000), t("b", "2026-06-01", "ind", "hdfc", 500, { receivedAmount: 44000, reference: "W1" })], accounts);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0]).toMatchObject({ title: "IND Money → HDFC", detail: "Back from a broker · W1", amountText: "$500.00" });
    expect(rows[1]).toMatchObject({ title: "HDFC → Zerodha", detail: "Sent to a broker", amountText: "₹1,00,000" });
  });

  it("leaves out bank to bank, broker to broker and accounts that are gone", () => {
    const rows = transferRows([t("a", "2026-05-01", "hdfc", "sbi", 1), t("b", "2026-05-02", "zer", "ind", 1), t("c", "2026-05-03", "hdfc", "gone", 1)], accounts);
    expect(rows).toEqual([]);
  });

  it("keeps the newest few", () => {
    const many = Array.from({ length: TRANSFER_ROWS + 3 }, (_, i) => t(`t${i}`, `2026-01-${String(i + 1).padStart(2, "0")}`, "hdfc", "zer", 1));
    const rows = transferRows(many, accounts);
    expect(rows).toHaveLength(TRANSFER_ROWS);
    expect(rows[0].id).toBe(`t${TRANSFER_ROWS + 2}`);
  });
});
