import { describe, expect, it } from "vitest";
import { thisYear } from "@/lib/aggregate/period";
import { demoAccountsData } from "@/lib/demo/accountsDemo";
import { formatInr } from "@/lib/format/money";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { detailFor } from "./detailView";

const today = "2026-10-22";
const data = demoAccountsData(today);
const all = detailFor(data, null, thisYear(today), today);

describe("detailFor", () => {
  it("answers four things, in this order", () => {
    expect(all.answers.map((a) => a.label)).toEqual(["Came in", "Spent", "Invested", "In the bank now"]);
  });

  it("gives months that add up to the answers: the real change, and the cash and UPI that has no record", () => {
    const left = all.months.reduce((t, m) => t + m.left, 0);
    expect(all.answers[3].note).toContain(`${left >= 0 ? "Up" : "Down"} ${formatInr(Math.abs(left))} since`);
    expect(all.answers[3].value).toBe("₹10,78,100");
    // Spent is what the records explain plus the cash and UPI that left with no record, summed over the same months.
    const recorded = all.months.reduce((t, m) => t + m.cardBills + m.emis + m.bigSpends + m.subscriptions, 0);
    const cashUpi = all.months.reduce((t, m) => t + m.cashUpi, 0);
    expect(cashUpi).toBeLessThan(0);
    expect(all.answers[1].value).toBe(formatInr(recorded - cashUpi));
    expect(all.answers[1].note).toContain("cash and UPI");
  });

  it("starts at January and ends on this month, one row each", () => {
    expect(all.months[0].key).toBe("2026-01");
    expect(all.months.at(-1)!.key).toBe("2026-10");
    expect(all.months).toHaveLength(10);
  });

  it("keeps a broker's own balance out of what was left and what went with no record", () => {
    const broker = { id: "bk", name: "Broker cash", bank: "Zerodha", accountType: "Brokerage" as const, purpose: "Investment" as const, startDate: "2020-01-01", status: "Active" as const };
    const withBroker: AccountsData = {
      ...data,
      accounts: [...data.accounts, broker],
      snapshots: [...data.snapshots, { id: "bk-a", accountId: "bk", date: "2025-12-31", balance: 100000 }, { id: "bk-b", accountId: "bk", date: today, balance: 900000 }],
    };
    const detail = detailFor(withBroker, null, thisYear(today), today);
    expect(detail.answers).toEqual(all.answers);
    expect(detail.months.map((m) => m.left)).toEqual(all.months.map((m) => m.left));
    // The broker itself has no bank story to tell.
    const own = detailFor(withBroker, "bk", thisYear(today), today);
    expect(own.answers[3].value).toBe("₹0");
    expect(own.months.every((m) => m.cashUpi === 0)).toBe(true);
  });

  it("splits one account's numbers from All's", () => {
    const hdfc = detailFor(data, "demo-hdfc", thisYear(today), today);
    expect(hdfc.answers[0].value).not.toBe("₹0");
    expect(detailFor(data, "demo-kotak", thisYear(today), today).answers[0].value).toBe("₹0");
  });

  it("lists what's coming for the pick, soonest first, marking a bill as about", () => {
    const coming = all.coming;
    expect(coming.length).toBeGreaterThan(0);
    expect(coming.some((c) => c.kind === "EMI")).toBe(true);
    expect(detailFor(data, "demo-axis", thisYear(today), today).coming.every((c) => c.account === "Axis EMI")).toBe(true);
  });
});
