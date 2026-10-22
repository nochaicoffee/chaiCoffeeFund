import { describe, expect, it } from "vitest";
import { afterPayment, billAfterPayment, nextDueAfterAdding, paymentContext, type Payment } from "./cardEntry";
import { allCardsUtilization, pendingSummary, type CardData } from "./cardSpend";
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
  const preview = (d: CardData, id: string, payment: Payment) => afterPayment(paymentContext(d, TODAY, id), payment);

  it("takes a bill marked Paid out of outstanding and utilization", () => {
    expect(preview(data, "s-regalia", { amountPaid: 38500, status: "Paid" })).toEqual({
      outstandingBefore: 50900,
      outstandingAfter: 12400,
      utilizationBefore: 50900 / 400000,
      utilizationAfter: 12400 / 400000,
      pendingAfter: { count: 1, total: 12400 },
    });
  });

  it("takes out the whole bill when it's marked Paid short of the total: the rest shows as underpaid, not outstanding", () => {
    expect(preview(data, "s-regalia", { amountPaid: 3850, status: "Paid" })).toMatchObject({ outstandingAfter: 12400, pendingAfter: { count: 1, total: 12400 } });
  });

  it("keeps what's left on a bill that stays Pending: paying the ₹3,850 minimum on ₹38,500 leaves ₹34,650", () => {
    expect(preview(data, "s-regalia", { amountPaid: 3850, status: "Pending" })).toEqual({
      outstandingBefore: 50900,
      outstandingAfter: 47050,
      utilizationBefore: 50900 / 400000,
      utilizationAfter: 47050 / 400000,
      pendingAfter: { count: 2, total: 47050 },
    });
  });

  it("starts from what's already paid on a part-paid bill, and the new amount replaces it (it's the bill's running total)", () => {
    const partPaid = { ...data, statements: [pending("s1", "regalia", "2026-08-25", 38500, 8500)] };
    expect(preview(partPaid, "s1", { amountPaid: 38500, status: "Paid" })).toMatchObject({ outstandingBefore: 30000, outstandingAfter: 0 });
    expect(preview(partPaid, "s1", { amountPaid: 20000, status: "Pending" })).toMatchObject({ outstandingBefore: 30000, outstandingAfter: 18500, pendingAfter: { count: 1, total: 18500 } });
  });

  it("changes nothing when a paid bill's payment is raised, and adds back what's left when an edit reopens it", () => {
    // The HDFC Regalia Gold January 2026 bill (₹16,098), paid twice.
    const january: Statement = { ...pending("s-jan", "regalia", "2026-02-05", 16098, 16098), status: "Paid" };
    const withJanuary = { ...data, statements: [...data.statements, january] };
    expect(preview(withJanuary, "s-jan", { amountPaid: 32196, status: "Paid" })).toMatchObject({ outstandingBefore: 50900, outstandingAfter: 50900, pendingAfter: { count: 2 } });
    expect(preview(withJanuary, "s-jan", { amountPaid: 10000, status: "Pending" })).toMatchObject({ outstandingBefore: 50900, outstandingAfter: 56998, pendingAfter: { count: 3, total: 56998 } });
  });

  it("leaves utilization out for a closed card but still counts it as outstanding", () => {
    const closed = { cards: [card("old", 50000, "Closed")], statements: [pending("s1", "old", "2026-08-25", 1000)] };
    expect(preview(closed, "s1", { amountPaid: 1000, status: "Paid" })).toEqual({ outstandingBefore: 1000, outstandingAfter: 0, utilizationBefore: null, utilizationAfter: null, pendingAfter: { count: 0, total: 0 } });
    const mixed = { cards: [card("old", 50000, "Closed"), card("new", 100000)], statements: [pending("s1", "old", "2026-08-25", 1000), pending("s2", "new", "2026-08-25", 5000)] };
    expect(preview(mixed, "s1", { amountPaid: 400, status: "Pending" })).toMatchObject({ outstandingAfter: 5600, utilizationAfter: 5000 / 100000 });
  });

  it("always matches what the dashboard shows once the payment is saved", () => {
    const january: Statement = { ...pending("s-jan", "regalia", "2026-02-05", 16098, 16098), status: "Paid" };
    const closedCard = card("old", 50000, "Closed");
    const all: CardData = {
      cards: [...data.cards, closedCard],
      statements: [...data.statements, january, pending("s-part", "gold", "2026-09-01", 41200, 5000), pending("s-old", "old", "2026-08-30", 2300), pending("s-credit", "amazon", "2026-09-02", -700)],
    };
    const payments: Payment[] = [0, 1, 3850, 16098, 20000.5, 38500, 50000].flatMap((amountPaid) => [
      { amountPaid, status: "Paid" as const },
      { amountPaid, status: "Pending" as const },
    ]);
    for (const s of all.statements) {
      for (const payment of payments) {
        const saved = { ...all, statements: all.statements.map((x) => (x.id === s.id ? { ...x, ...payment } : x)) };
        const dashboard = allCardsUtilization(saved);
        const due = pendingSummary(saved, TODAY);
        const { outstandingAfter, utilizationAfter, pendingAfter } = preview(all, s.id, payment);
        expect(outstandingAfter).toBeCloseTo(dashboard.outstanding, 6);
        expect(utilizationAfter).toBeCloseTo(dashboard.utilization!, 9);
        expect(pendingAfter.count).toBe(due.count);
        expect(pendingAfter.total).toBeCloseTo(due.total, 6);
      }
    }
  });
});

describe("billAfterPayment", () => {
  const bill: Statement = { ...pending("s1", "regalia", "2026-08-25", 38500), minimumAmountDue: 3850 };

  it("is Paid with its variance once the payment closes it", () => {
    expect(billAfterPayment(bill, { amountPaid: 38500, status: "Paid" })).toEqual({ status: "Paid", variance: { kind: "full" } });
    expect(billAfterPayment(bill, { amountPaid: 30000, status: "Paid" })).toEqual({ status: "Paid", variance: { kind: "under", amount: 8500 } });
    expect(billAfterPayment(bill, { amountPaid: 77000, status: "Paid" })).toEqual({ status: "Paid", variance: { kind: "over", amount: 38500 } });
  });

  it("is Pending with what's left of the total and of the minimum, the minimum paid off first", () => {
    expect(billAfterPayment(bill, { amountPaid: 2000, status: "Pending" })).toEqual({ status: "Pending", left: 36500, minimumLeft: 1850 });
    expect(billAfterPayment(bill, { amountPaid: 3850, status: "Pending" })).toEqual({ status: "Pending", left: 34650, minimumLeft: 0 });
    expect(billAfterPayment(bill, { amountPaid: 10000, status: "Pending" })).toEqual({ status: "Pending", left: 28500, minimumLeft: 0 });
  });
});
