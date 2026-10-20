import { describe, expect, it } from "vitest";
import type { Statement } from "../sheets/types";
import { canUndo, completePayment, payInFull, paymentFields } from "./quickPay";

const pending: Statement = { id: "s1", cardId: "c1", statementDate: "2026-10-15", dueDate: "2026-11-04", totalAmountDue: 38500, minimumAmountDue: 1925, status: "Pending" };
const TODAY = "2026-10-20";

describe("payInFull", () => {
  it("records the total due as paid today, from the card's usual account", () => {
    expect(payInFull(pending, { defaultPaidFromAccountId: "hdfc" }, TODAY)).toEqual({
      status: "Paid",
      amountPaid: 38500,
      paidDate: TODAY,
      paidFromAccountId: "hdfc",
      paidFromCardId: undefined,
    });
  });

  it("leaves the account blank when the card has no usual one", () => {
    expect(payInFull(pending, {}, TODAY)).toMatchObject({ paidFromAccountId: undefined, paidFromCardId: undefined });
    expect(payInFull(pending, undefined, TODAY).paidFromAccountId).toBeUndefined();
  });

  it("pays off a part-paid bill: the amount is the whole total, and where the part came from stays", () => {
    const part = { ...pending, amountPaid: 10000, paidDate: "2026-10-18", paidFromCardId: "c2" };
    expect(payInFull(part, { defaultPaidFromAccountId: "hdfc" }, TODAY)).toEqual({ status: "Paid", amountPaid: 38500, paidDate: TODAY, paidFromAccountId: undefined, paidFromCardId: "c2" });
  });

  it("records ₹0 paid on a credit balance", () => {
    expect(payInFull({ ...pending, totalAmountDue: -4708.5, minimumAmountDue: 0 }, {}, TODAY).amountPaid).toBe(0);
  });
});

describe("canUndo", () => {
  const written = payInFull(pending, { defaultPaidFromAccountId: "hdfc" }, TODAY);
  const paid = { ...pending, ...written };

  it("allows undo while the statement still holds what the click wrote", () => {
    expect(canUndo(paid, written)).toBe(true);
  });

  it("refuses once it's been edited since, so undo never overwrites a newer change", () => {
    expect(canUndo({ ...paid, amountPaid: 38000 }, written)).toBe(false);
    expect(canUndo({ ...paid, status: "Pending" }, written)).toBe(false);
  });

  it("puts back every field, blanks included", () => {
    expect(paymentFields(pending)).toEqual({ status: "Pending", amountPaid: undefined, paidDate: undefined, paidFromAccountId: undefined, paidFromCardId: undefined });
  });
});

describe("completePayment", () => {
  it("lists every field, so a blank arriving as a missing key still clears its cell", () => {
    // What Undo's "before" looks like once it has crossed from the browser to a server action.
    const arrived = JSON.parse(JSON.stringify(paymentFields(pending)));
    expect(arrived).toEqual({ status: "Pending" });
    const complete = completePayment(arrived);
    expect(Object.keys(complete).sort()).toEqual(["amountPaid", "paidDate", "paidFromAccountId", "paidFromCardId", "status"]);
    expect(complete).toEqual({ status: "Pending", amountPaid: undefined, paidDate: undefined, paidFromAccountId: undefined, paidFromCardId: undefined });
  });
});
