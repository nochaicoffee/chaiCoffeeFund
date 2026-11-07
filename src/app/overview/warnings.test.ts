import { describe, expect, it } from "vitest";
import { collectWarnings, fromAccounts, fromCards, fromFixed, fromGoals, fromIncome, fromInsurance, fromLent, fromLoans, fromProblems, warningCounts, type OverviewWarning } from "./warnings";
import type { Card, Statement } from "@/lib/sheets/types";

const w = (over: Partial<OverviewWarning>): OverviewWarning => ({ id: "x", tone: "info", page: "cards", text: "t", detail: "d", act: "a", href: "/cards", date: null, ...over });

describe("the page adapters", () => {
  it("loans: due today or overdue is red, later amber, and carries its day and ref", () => {
    const [today] = fromLoans([{ installmentId: "i1", loanId: "l", name: "HDFC Car Loan", amount: "₹19,850", text: "is due 7 Nov (today).", overdue: false, dueDate: "2026-11-07" }], "2026-11-07");
    expect(today).toMatchObject({ tone: "red", page: "loans", date: "2026-11-07", ref: "installment:i1", act: "Mark paid" });
    const [soon] = fromLoans([{ installmentId: "i2", loanId: "l", name: "Home", amount: "₹31,200", text: "is due 12 Nov (in 5 days).", overdue: false, dueDate: "2026-11-12" }], "2026-11-07");
    expect(soon.tone).toBe("amber");
    expect(fromLoans([{ installmentId: "i3", loanId: "l", name: "X", amount: "₹1", text: "was due", overdue: true, dueDate: "2026-11-01" }], "2026-11-07")[0].tone).toBe("red");
  });
  it("lent out: a payout never come is red, the rest amber; an untracked payout loan stays on its page", () => {
    const list = fromLent([
      { id: "a", kind: "payout", tone: "late", title: "A", text: "x" },
      { id: "b", kind: "long-out", tone: "warn", title: "B", text: "y" },
      { id: "c", kind: "unlinked", tone: "warn", title: "C", text: "z" },
    ]);
    expect(list.map((x) => [x.id, x.tone])).toEqual([["lent:a", "red"], ["lent:b", "amber"]]);
  });
  it("fixed income: only a late credit and a matured deposit; the credited good news and the interest estimates stay on its page", () => {
    const list = fromFixed([{ id: "credited", kind: "credited", tone: "ok", title: "ok", text: "" }, { id: "interest", kind: "interest", tone: "warn", title: "EPF's interest isn't credited yet", text: "" }, { id: "incomplete", kind: "incomplete", tone: "warn", title: "no bank", text: "" }, { id: "due", kind: "due", tone: "warn", title: "ICICI FD matured", text: "close it", depositId: "d" }, { id: "late-x", kind: "late", tone: "late", title: "EPF credit", text: "" }]);
    expect(list.map((x) => [x.id, x.tone, x.act])).toEqual([["fixed:due", "amber", "Close it"], ["fixed:late-x", "red", "Open Fixed income"]]);
  });
  it("insurance, goals, accounts and income each map to their page", () => {
    expect(fromInsurance([{ policyId: "p", name: "Health", text: "renews 28 Nov", tone: "soon", renewsOn: "2026-11-28" }])[0]).toMatchObject({ page: "ins", tone: "amber", date: "2026-11-28", ref: "policy:p" });
    expect(fromInsurance([{ policyId: "p", name: "Car", text: "lapsed", tone: "lapsed", renewsOn: "2026-10-01" }])[0].tone).toBe("red");
    expect(fromGoals([{ id: "g", tone: "negative", label: "Trip · overdue", detail: "x" }, { id: "h", tone: "warning", label: "Car", detail: "y" }]).map((x) => x.tone)).toEqual(["red", "amber"]);
    expect(fromAccounts([{ id: "r", accountId: "a", accountName: "HDFC", dateText: "1 Nov", recordedText: "₹1", statementText: "₹2", differenceText: "+₹1" }])[0]).toMatchObject({ page: "accounts", tone: "amber" });
    expect(fromIncome([{ sourceId: "s", name: "Salary", text: "was expected", amount: "₹1" }])[0]).toMatchObject({ page: "income", id: "income:s" });
  });
});

describe("fromCards", () => {
  const card: Card = { id: "c1", name: "Regalia", alias: "HDFC Regalia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 1, statementDay: 1, dueDayBuffer: 19, status: "Active" };
  const st = (over: Partial<Statement>): Statement => ({ id: "s", cardId: "c1", statementDate: "2026-10-28", dueDate: "2026-11-18", totalAmountDue: 41200, minimumAmountDue: 500, status: "Pending", ...over });
  it("ranks by how near the due day is, ignores paid and empty statements, and still lists a closed card's unpaid bill", () => {
    const out = fromCards(
      [card, { ...card, id: "c2", status: "Closed" }],
      [st({ id: "late", dueDate: "2026-11-01" }), st({ id: "soon", dueDate: "2026-11-10" }), st({ id: "far" }), st({ id: "paid", status: "Paid" }), st({ id: "zero", totalAmountDue: 0 }), st({ id: "closed", cardId: "c2" }), st({ id: "part", amountPaid: 41200 })],
      "2026-11-07",
    );
    expect(out.map((x) => [x.ref, x.tone])).toEqual([["statement:late", "red"], ["statement:soon", "amber"], ["statement:far", "info"], ["statement:closed", "info"]]);
    expect(out[0].detail).toContain("6 days overdue");
  });
});

describe("fromProblems", () => {
  it("names each source that couldn't be read, on its own page", () => {
    const out = fromProblems({ epf: true, lent: false, goals: false, insurance: false, prices: true, unpricedAccounts: [{ name: "Vested", reason: "no rate" }] });
    expect(out.map((x) => [x.page, x.id])).toEqual([["fixed", "problem:epf"], ["invest", "problem:prices"], ["accounts", "problem:unpriced-Vested"]]);
    expect(out.every((x) => x.tone === "amber")).toBe(true);
    expect(fromProblems({ epf: false, lent: false, goals: false, insurance: false, prices: false, unpricedAccounts: [] })).toEqual([]);
  });
});

describe("collectWarnings and warningCounts", () => {
  const list = collectWarnings(
    [w({ id: "info-late", tone: "info", date: "2026-11-24" }), w({ id: "amber-nodate", tone: "amber" }), w({ id: "red", tone: "red", date: "2026-11-07" })],
    [w({ id: "info-early", tone: "info", date: "2026-11-18" }), w({ id: "amber-dated", tone: "amber", date: "2026-11-20" })],
  );
  it("puts act-now first, then soon, then worth knowing; dated before undated, soonest first, ties by arrival", () => {
    expect(list.map((x) => x.id)).toEqual(["red", "amber-dated", "amber-nodate", "info-early", "info-late"]);
  });
  it("counts each tone and groups by page", () => {
    const c = warningCounts([...list, w({ id: "g", page: "goals", tone: "amber" })]);
    expect(c).toMatchObject({ red: 1, amber: 3, info: 2, total: 6 });
    expect(c.byPage.goals).toHaveLength(1);
    expect(c.byPage.cards).toHaveLength(5);
  });
  it("is empty when no page has anything to say", () => {
    expect(collectWarnings([], [])).toEqual([]);
    expect(warningCounts([])).toMatchObject({ total: 0, red: 0 });
  });
});
