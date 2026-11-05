import { describe, expect, it } from "vitest";
import { depositFormsData } from "./depositFormsData";
import type { Account, FixedDeposit } from "@/lib/sheets/types";

const fd = (over: Partial<FixedDeposit>): FixedDeposit => ({ id: "x", name: "FD", principalAmount: 15000, interestRate: 7.75, compoundingType: "Cumulative", startDate: "2026-03-13", maturityDate: "2027-09-14", status: "Active", ...over });
const account = (over: Partial<Account>): Account => ({ id: "a", name: "HDFC Salary", bank: "HDFC", accountType: "Savings", status: "Active", ...over }) as Account;

describe("depositFormsData", () => {
  const data = depositFormsData(
    [fd({ id: "late", maturityDate: "2028-05-02" }), fd({ id: "soon", maturityDate: "2026-11-01", startDate: "2025-05-01" }), fd({ id: "done", status: "Closed", closedDate: "2026-06-01", receivedAmount: 16000, closeKind: "Pre-closed" }), fd({ id: "mid", maturityDate: "2027-09-14" })],
    [account({ id: "a" }), account({ id: "b", status: "Inactive" }), account({ id: "c", accountType: "Brokerage" })],
    "2026-11-05",
  );
  it("lists what is held by the soonest maturity, then what is closed", () => {
    expect(data.deposits.map((d) => d.id)).toEqual(["soon", "mid", "late", "done"]);
  });
  it("marks a deposit past its maturity day that isn't closed as due, and a closed one holds nothing", () => {
    const by = Object.fromEntries(data.deposits.map((d) => [d.id, d]));
    expect(by.soon.due).toBe(true);
    expect(by.mid.due).toBe(false);
    expect(by.done).toMatchObject({ due: false, worth: 0 });
    expect(by.mid.worth).toBeGreaterThan(15000);
  });
  it("expects the bank's figure at maturity when there is one, and the estimate otherwise", () => {
    const rows = depositFormsData([fd({ id: "a", maturityAmount: 17500 }), fd({ id: "b" })], [], "2026-11-05").deposits;
    expect(rows[0].expectedAtMaturity === 17500 || rows[1].expectedAtMaturity === 17500).toBe(true);
    expect(rows.find((r) => r.id === "b")!.expectedAtMaturity).toBeGreaterThan(15000);
  });
  it("a paid-out deposit pays back its principal at maturity, not a compounded figure", () => {
    const rows = depositFormsData([fd({ id: "p", compoundingType: "Non-Cumulative", payoutFrequency: "Quarterly" }), fd({ id: "c" })], [], "2026-11-05").deposits;
    expect(rows.find((r) => r.id === "p")!.expectedAtMaturity).toBe(15000);
    expect(rows.find((r) => r.id === "c")!.expectedAtMaturity).toBeGreaterThan(15000);
  });
  it("keeps deposits with the same dates in a fixed order", () => {
    const same = [fd({ id: "b" }), fd({ id: "a" }), fd({ id: "c" })];
    const ids = (list: FixedDeposit[]) => depositFormsData(list, [], "2026-11-05").deposits.map((d) => d.id);
    expect(ids(same)).toEqual(["a", "b", "c"]);
    expect(ids([...same].reverse())).toEqual(["a", "b", "c"]);
  });
  it("offers only active, non-broker accounts to pay from", () => {
    expect(data.accounts).toEqual([{ id: "a", name: "HDFC Salary" }]);
  });
});
