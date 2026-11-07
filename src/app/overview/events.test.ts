import { describe, expect, it } from "vitest";
import { eventWarning, overviewEvents, warningsWithoutDay, windowTotals } from "./events";
import type { OverviewData } from "./model";
import type { OverviewWarning } from "./warnings";
import type { Card, FixedDeposit, IncomeSource, Loan, LoanInstallment, Statement, Subscription } from "@/lib/sheets/types";

const card: Card = { id: "c1", name: "Regalia", alias: "HDFC Regalia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 1, statementDay: 1, dueDayBuffer: 19, status: "Active" };
const loan = { id: "l1", name: "Car Loan", status: "Active" } as Loan;
const inst = (id: string, due: string, total: number, status: "Pending" | "Paid" = "Pending"): LoanInstallment => ({ id, loanId: "l1", installmentNumber: 1, dueDate: due, openingBalance: 0, principalDue: total, interestDue: 0, totalDue: total, status });
const stmt = (id: string, due: string, total: number, status: "Pending" | "Paid" = "Pending"): Statement => ({ id, cardId: "c1", statementDate: "2026-10-28", dueDate: due, totalAmountDue: total, minimumAmountDue: 1, status });
const fd = (id: string, maturity: string, status: FixedDeposit["status"] = "Active"): FixedDeposit => ({ id, name: `FD ${id}`, principalAmount: 100000, interestRate: 7, compoundingType: "Cumulative", startDate: "2025-01-01", maturityDate: maturity, maturityAmount: 107000, status });
const source: IncomeSource = { id: "src", name: "NetApp salary", alias: "", category: "Salary", frequency: "Monthly", expectedAmount: 248000, scheduleDate: "2026-11-30", status: "Active" } as unknown as IncomeSource;
const sub = (id: string, over: Partial<Subscription> = {}): Subscription => ({ id, name: `Sub ${id}`, alias: id, category: "Software", amount: 500, billingCycle: "Monthly", billingAnchorDate: "2026-01-09", startDate: "2026-01-09", status: "Active", ...over });

const base: OverviewData = {
  accounts: [], balanceSnapshots: [], unpriced: undefined, cards: [card], statements: [], subscriptions: [], subscriptionPayments: [], loans: [loan], loanInstallments: [], loanPrepayments: [], trades: [], instruments: [], closes: new Map(), pricesFailed: false,
  fixedDeposits: [], incomeEntries: [], incomeSources: [], epf: { accounts: [], entries: [], rates: [], failed: false }, lent: { loans: [], repayments: [], failed: false }, goals: { goals: [], contributions: [], failed: false }, insurance: { policies: [], payments: [], failed: true },
};
const TODAY = "2026-11-07";

describe("overviewEvents", () => {
  it("lists EMIs and card bills inside the next 30 days, soonest first, leaving out what is paid or beyond", () => {
    const events = overviewEvents({ ...base, loanInstallments: [inst("i1", "2026-11-07", 19850), inst("i2", "2026-12-20", 31200), inst("i3", "2026-11-01", 5, "Paid")], statements: [stmt("s2", "2026-11-24", 27200), stmt("s1", "2026-11-18", 41200), stmt("s0", "2026-11-18", 9, "Paid")] }, TODAY);
    expect(events.map((e) => [e.date, e.kind, e.amount, e.cash])).toEqual([["2026-11-07", "emi", -19850, true], ["2026-11-18", "card", -41200, true], ["2026-11-24", "card", -27200, true]]);
    expect(events[0].ref).toBe("installment:i1");
  });
  it("shows a maturing deposit as money that lands only when closed, never as cash", () => {
    const events = overviewEvents({ ...base, fixedDeposits: [fd("a", "2026-11-20"), fd("b", "2027-03-01"), fd("c", "2026-11-12", "Closed")] }, TODAY);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "deposit", cash: false, amount: 107000 });
  });
  it("shows expected income at the source's usual amount", () => {
    const events = overviewEvents({ ...base, incomeSources: [source] }, TODAY);
    expect(events.find((e) => e.kind === "income")).toMatchObject({ date: "2026-11-30", amount: 248000, cash: true });
  });
  it("shows a subscription off a card as leaving the bank, and one on a card as inside its bill (not cash)", () => {
    const events = overviewEvents({ ...base, subscriptions: [sub("gym"), sub("stream", { defaultPaidFromCardId: "c1" })] }, TODAY);
    const gym = events.find((e) => e.label === "Sub gym");
    const stream = events.find((e) => e.label === "Sub stream");
    expect(gym).toMatchObject({ date: "2026-11-09", amount: -500, cash: true, kind: "subscription" });
    expect(stream).toMatchObject({ date: "2026-11-09", cash: false });
  });
  it("is empty when nothing is dated inside the window, and an unreadable insurance adds nothing", () => {
    expect(overviewEvents(base, TODAY)).toEqual([]);
    expect(overviewEvents({ ...base, loanInstallments: [inst("i9", "2026-12-08", 1)] }, TODAY)).toEqual([]); // 31 days out
  });
});

describe("joining events and warnings", () => {
  const warning = (over: Partial<OverviewWarning>): OverviewWarning => ({ id: "w", tone: "amber", page: "loans", text: "", detail: "", act: "", href: "", date: null, ...over });
  const events = overviewEvents({ ...base, loanInstallments: [inst("i1", "2026-11-07", 19850)] }, TODAY);
  it("finds the warning an event is about by its ref", () => {
    const w1 = warning({ id: "a", ref: "installment:i1" });
    expect(eventWarning(events[0], [warning({ id: "z", ref: "installment:zz" }), w1])).toBe(w1);
    expect(eventWarning(events[0], [])).toBeNull();
  });
  it("leaves the warnings that have no event on the page's now list", () => {
    const joined = warning({ id: "a", ref: "installment:i1" });
    const free = warning({ id: "b" });
    const overdue = warning({ id: "c", ref: "installment:old" });
    expect(warningsWithoutDay([joined, free, overdue], events).map((x) => x.id)).toEqual(["b", "c"]);
  });
});

describe("windowTotals", () => {
  it("adds only cash events: money out and money in", () => {
    const events = [
      { amount: -100, cash: true }, { amount: -50, cash: false }, { amount: 300, cash: true }, { amount: 70, cash: false },
    ] as Parameters<typeof windowTotals>[0];
    expect(windowTotals(events)).toEqual({ out: 100, in: 300 });
  });
});
