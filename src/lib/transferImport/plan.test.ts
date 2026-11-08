import { describe, expect, it } from "vitest";
import type { LedgerTransfer } from "./ledgers";
import { planTransfers } from "./plan";

const line = (o: Partial<LedgerTransfer>): LedgerTransfer => ({ date: "2026-05-12", direction: "in", amount: 1000, reference: "r1", text: "", ...o });
const accounts = [
  { id: "sbi", name: "SBI", last4: "5678", accountType: "Savings" as const },
  { id: "jupiter", name: "Jupiter", last4: "7188", accountType: "Savings" as const },
  { id: "zerodha", name: "Zerodha", accountType: "Brokerage" as const },
];

describe("planTransfers", () => {
  it("sends a pay-in from the default bank to the broker, and a payout to the bank it names", () => {
    const plan = planTransfers([line({ reference: "a" }), line({ reference: "b", direction: "out", amount: 500, bank: { name: "SBI", last4: "5678" } })], { brokerId: "zerodha", accounts, existing: [], defaultBankId: "jupiter" });
    expect(plan.add).toEqual([
      { date: "2026-05-12", fromAccountId: "jupiter", toAccountId: "zerodha", amount: 1000, reference: "a", source: "Statement" },
      { date: "2026-05-12", fromAccountId: "zerodha", toAccountId: "sbi", amount: 500, reference: "b", source: "Statement" },
    ]);
  });

  it("matches a last four he maps by hand, and never guesses a bank a payout names that isn't known", () => {
    const named = line({ reference: "c", direction: "out", bank: { name: "FEDERAL", last4: "7833" } });
    expect(planTransfers([named], { brokerId: "zerodha", accounts, existing: [], defaultBankId: "jupiter" }).unresolved).toHaveLength(1);
    expect(planTransfers([named], { brokerId: "zerodha", accounts, existing: [], banksByLast4: { "7833": "jupiter" } }).add[0].toAccountId).toBe("jupiter");
  });

  it("waits on a line with no bank when there's no default, and skips one already recorded", () => {
    const plan = planTransfers([line({ reference: "d" }), line({ reference: "seen" })], { brokerId: "zerodha", accounts, existing: [{ reference: "seen" }] });
    expect([plan.add.length, plan.already, plan.unresolved.map((u) => u.reference)]).toEqual([0, 1, ["d"]]);
  });
});
