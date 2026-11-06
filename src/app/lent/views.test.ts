import { describe, expect, it } from "vitest";
import { attentionView, greetingView, lentModel, summarySentence, type LentData } from "./views";
import type { IncomeEntry, IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

const TODAY = "2026-11-06";
const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const b: LentLoan = { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active", incomeSourceId: "sb" };
const c: LentLoan = { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active", incomeSourceId: "sc" };
const sb: IncomeSource = { id: "sb", name: "B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" };
const sc: IncomeSource = { id: "sc", name: "C", alias: "C", category: "Investment", frequency: "Quarterly", expectedAmount: 18000, status: "Active", scheduleDate: "2026-04-01" };
let n = 0;
const got = (sourceId: string, expected: string, received: string, amount: number): IncomeEntry => ({ id: `e${++n}`, incomeSourceId: sourceId, expectedDate: expected, receivedDate: received, amount, status: "Received", tag: "Regular" });
/** The mockups' sample: ₹3L pays 10 of 12 months (Feb never came, Nov 5 days over); ₹1.82L pays all three quarters. */
const entries: IncomeEntry[] = [
  got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-01-01", "2026-01-02", 6000), got("sb", "2026-03-01", "2026-03-10", 6000), got("sb", "2026-04-01", "2026-04-01", 6000),
  got("sb", "2026-05-01", "2026-05-02", 6000), got("sb", "2026-06-01", "2026-06-01", 6000), got("sb", "2026-07-01", "2026-07-01", 6000), got("sb", "2026-08-01", "2026-08-03", 6000),
  got("sb", "2026-09-01", "2026-09-01", 6000), got("sb", "2026-10-01", "2026-10-01", 6000),
  got("sc", "2026-04-01", "2026-04-01", 18000), got("sc", "2026-07-01", "2026-07-04", 18000), got("sc", "2026-10-01", "2026-10-01", 18000),
];
const data: LentData = { loans: [a, b, c], repayments: [], sources: [sb, sc], entries };
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");
const strong = (parts: { text: string; strong?: boolean; point?: string }[]) => parts.filter((p) => p.strong).map((p) => [p.text, p.point]);

describe("the greeting sentence", () => {
  const m = lentModel(data, TODAY);
  it("reads as the mockup's: what is out, the loans, a day, the pile, what hasn't come, the next payout", () => {
    expect(text(summarySentence(m))).toBe("₹12,95,693 is out with 3 loans, earning about ₹608 a day. ₹1,63,693 of it is interest piling up on Friend's 12% loan, and ₹12,000 of payouts hasn't reached you. The next one is ₹6,000 on Tue, Dec 1.");
  });
  it("points at six figures, each with a card", () => {
    const points = summarySentence(m).filter((p) => p.point).map((p) => p.point);
    expect(points).toEqual(["total", "loans", "perDay", "pile", "notHere", "next"]);
    const cards = greetingView(m);
    for (const point of points) expect(cards[point as keyof typeof cards], point).toBeDefined();
  });
  it("has every bold figure agree with its card's total", () => {
    const cards = greetingView(m);
    const bold = Object.fromEntries(strong(summarySentence(m)).map(([t, p]) => [p, t]));
    expect(cards.total?.total).toBe(bold.total);
    expect(cards.perDay?.total).toBe(bold.perDay?.replace(" a day", ""));
    expect(cards.pile?.total).toBe(bold.pile);
    expect(cards.notHere?.total).toBe(bold.notHere);
    expect(cards.next?.total).toBe(bold.next);
    expect(cards.loans?.total).toBe(bold.loans);
  });
  it("leaves out the pile and the not-here part when there is none", () => {
    const clean = lentModel({ loans: [b], repayments: [], sources: [sb], entries: entries.filter((e) => e.incomeSourceId === "sb").concat([got("sb", "2026-02-01", "2026-02-02", 6000), got("sb", "2026-11-01", "2026-11-01", 6000)]) }, TODAY);
    expect(text(summarySentence(clean))).toBe("₹3,00,000 is out with 1 loan, earning about ₹197 a day. The next one is ₹6,000 on Tue, Dec 1.");
    expect(greetingView(clean).pile).toBeUndefined();
    expect(greetingView(clean).notHere).toBeUndefined();
  });
  it("says nothing is lent, and when everything has come back", () => {
    expect(text(summarySentence(lentModel({ loans: [], repayments: [], sources: [], entries: [] }, TODAY)))).toMatch(/^Nothing lent yet/);
    const repaid: LentLoan = { ...a, status: "Repaid", closedDate: "2026-01-01" };
    expect(text(summarySentence(lentModel({ ...data, loans: [repaid] }, TODAY)))).toBe("Everything you lent has come back: 1 loan repaid, nothing is out.");
    expect(greetingView(lentModel({ ...data, loans: [repaid] }, TODAY))).toEqual({});
  });
});

describe("the cards", () => {
  const cards = greetingView(lentModel(data, TODAY));
  it("splits what is out by loan, with shares that add to one", () => {
    expect(cards.total?.rows.map((r) => r.amount)).toEqual(["₹8,13,693", "₹3,00,000", "₹1,82,000"]);
    expect(cards.total?.rows.reduce((t, r) => t + (r.fraction ?? 0), 0)).toBeCloseTo(1, 12);
    expect(cards.total?.note).toBe("₹11,32,000 is principal and ₹1,63,693 is interest still owed.");
  });
  it("lists the payouts that are not here, the missing one flagged", () => {
    expect(cards.notHere?.rows).toMatchObject([
      { name: "Friend – ₹3L", amount: "₹6,000", note: "due Feb 1, never came", warn: true },
      { name: "Friend – ₹3L", amount: "₹6,000", note: "due Nov 1, 5 days over", warn: false },
    ]);
  });
  it("splits what it earns a day by loan", () => {
    expect(cards.perDay?.rows.map((r) => r.amount)).toEqual(["₹214", "₹197", "₹197"]);
    expect(cards.perDay?.note).toContain("₹2,22,000");
  });
  it("shows the pile of the 12% loan, none of it paid", () => {
    expect(cards.pile?.rows).toMatchObject([{ name: "Friend", amount: "₹1,63,693", note: "₹214 a day, none of it paid" }]);
  });
  it("names the next payout of each payout loan, soonest first", () => {
    expect(cards.next?.rows.map((r) => [r.name, r.amount])).toEqual([["Friend – ₹3L", "₹6,000"], ["Friend – ₹1.82L", "₹18,000"]]);
  });
});

describe("what needs attention", () => {
  it("flags the overdue and the missing payout together, and the loan out 766 days with nothing back", () => {
    const items = attentionView(lentModel(data, TODAY));
    expect(items.map((i) => [i.kind, i.tone])).toEqual([["payout", "late"], ["long-out", "warn"]]);
    expect(items[0].title).toBe("₹6,000 from Friend – ₹3L was due Sun, Nov 1 and hasn't arrived (5 days).");
    expect(items[0].text).toBe("Feb 1's ₹6,000 never did. Match the bank credit when it lands, or leave it open.");
    expect(items[0]).toMatchObject({ href: "/income", action: "Open Income" });
    expect(items[1].title).toBe("Friend's ₹6,50,000 is 766 days out with nothing paid back.");
    expect(items[1].text).toBe("₹1,63,693 of interest is owed, growing ₹214 a day. A measure, not a reminder to chase.");
  });
  it("is amber, not red, when a payout is only overdue", () => {
    const only = lentModel({ ...data, loans: [b], entries: entries.concat(got("sb", "2026-02-01", "2026-02-01", 6000)) }, TODAY);
    expect(attentionView(only).map((i) => [i.kind, i.tone])).toEqual([["payout", "warn"]]);
  });
  it("says a payout loan with no income source isn't tracked, and calls nothing missing", () => {
    const unlinked: LentLoan = { ...b, incomeSourceId: undefined };
    const items = attentionView(lentModel({ ...data, loans: [unlinked], sources: [] }, TODAY));
    expect(items.map((i) => i.kind)).toEqual(["unlinked"]);
  });
  it("names every payout that never came, together when there are several", () => {
    const three = lentModel({ ...data, loans: [b], entries: [got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-08-01", "2026-08-01", 6000), got("sb", "2026-09-01", "2026-09-01", 6000), got("sb", "2026-10-01", "2026-10-01", 6000)] }, TODAY);
    const item = attentionView(three)[0];
    expect(item.title).toBe("₹6,000 from Friend – ₹3L was due Sun, Nov 1 and hasn't arrived (5 days).");
    expect(item.text).toBe("7 earlier payouts, ₹42,000, never came. Match the bank credit when it lands, or leave it open.");
    const onlyMissing = lentModel({ ...data, loans: [b], entries: [got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-11-01", "2026-11-02", 6000)] }, TODAY);
    expect(attentionView(onlyMissing)[0].title).toBe("₹60,000 from Friend – ₹3L never came (10 payouts, the first due Thu, Jan 1).");
  });
  it("says a source with no schedule date needs one, not that it's missing", () => {
    const noDate: IncomeSource = { ...sb, scheduleDate: undefined };
    const items = attentionView(lentModel({ ...data, loans: [b], sources: [noDate] }, TODAY));
    expect(items).toMatchObject([{ kind: "unlinked", title: "Friend – ₹3L's income source has no schedule date." }]);
  });
  it("says nothing about a loan out a long time once something has been paid on it, or under a year", () => {
    const paid: LentRepayment[] = [{ id: "r", lentLoanId: "a", date: "2026-01-01", amount: 1000, kind: "Interest" }];
    expect(attentionView(lentModel({ ...data, loans: [a], repayments: paid }, TODAY))).toEqual([]);
    expect(attentionView(lentModel({ ...data, loans: [{ ...a, startDate: "2026-06-01" }] }, TODAY))).toEqual([]);
  });
});
