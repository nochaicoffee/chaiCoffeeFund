import { describe, expect, it } from "vitest";
import { afterPayment, nextDueAfterAdding } from "./cardEntry";
import type { CardData } from "./cardSpend";
import type { Card, Statement } from "../sheets/types";

const card = (id: string, creditLimit: number, status: Card["status"] = "Active"): Card => ({
  id,
  name: id,
  alias: id,
  issuer: "Other",
  cardType: "Cashback",
  creditLimit,
  statementDay: 5,
  dueDayBuffer: 20,
  status,
});
const pending = (id: string, cardId: string, dueDate: string, totalAmountDue: number, amountPaid?: number): Statement => ({
  id,
  cardId,
  statementDate: "2026-08-05",
  dueDate,
  totalAmountDue,
  minimumAmountDue: 0,
  status: "Pending",
  ...(amountPaid !== undefined && { amountPaid }),
});

/** The design's example: Regalia ₹38,500 due Aug 25 and Amazon ₹12,400 due Aug 23, on ₹4,00,000 of limits. */
const TODAY = "2026-08-18";
const data: CardData = {
  cards: [card("regalia", 120000), card("amazon", 80000), card("gold", 200000)],
  statements: [pending("s-regalia", "regalia", "2026-08-25", 38500), pending("s-amazon", "amazon", "2026-08-23", 12400)],
};

describe("nextDueAfterAdding", () => {
  it("adds the new statement to the pending bills, soonest due first, as the design's bar shows", () => {
    expect(nextDueAfterAdding(data, TODAY, { cardId: "gold", dueDate: "2026-09-01", totalAmountDue: 41200 })).toEqual({
      segments: [
        { cardId: "amazon", amount: 12400, isNew: false },
        { cardId: "regalia", amount: 38500, isNew: false },
        { cardId: "gold", amount: 41200, isNew: true },
      ],
      count: 3,
      total: 92100,
    });
  });

  it("counts a credit balance as ₹0 due", () => {
    expect(nextDueAfterAdding(data, TODAY, { cardId: "gold", dueDate: "2026-09-01", totalAmountDue: -500 }).total).toBe(50900);
  });

  it("is today's pending bills when nothing is being added yet", () => {
    expect(nextDueAfterAdding(data, TODAY, null)).toMatchObject({ count: 2, total: 50900 });
  });
});

describe("afterPayment", () => {
  it("takes the paid statement out of outstanding and utilization", () => {
    expect(afterPayment(data, TODAY, "s-regalia")).toEqual({
      outstandingBefore: 50900,
      outstandingAfter: 12400,
      utilizationBefore: 50900 / 400000,
      utilizationAfter: 12400 / 400000,
      pendingAfter: { count: 1, total: 12400 },
    });
  });

  it("takes out only what was still due on a part-paid bill", () => {
    const partPaid = { ...data, statements: [pending("s1", "regalia", "2026-08-25", 38500, 8500)] };
    expect(afterPayment(partPaid, TODAY, "s1")).toMatchObject({ outstandingBefore: 30000, outstandingAfter: 0 });
  });

  it("leaves utilization out for a closed card but still counts it as outstanding", () => {
    const closed = { cards: [card("old", 50000, "Closed")], statements: [pending("s1", "old", "2026-08-25", 1000)] };
    expect(afterPayment(closed, TODAY, "s1")).toEqual({ outstandingBefore: 1000, outstandingAfter: 0, utilizationBefore: null, utilizationAfter: null, pendingAfter: { count: 0, total: 0 } });
  });
});
