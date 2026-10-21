import { describe, expect, it } from "vitest";
import { anchorToSave, chargedToValue, markPaidPayment, offPlan, readDateForm, readPaymentForm, readSubscriptionForm, renewalToRecord } from "./subscriptionForms";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

const known = { accountIds: ["acc-1"], cardIds: ["card-1"] };
const filled = {
  name: "Netflix Premium",
  alias: "",
  category: "Streaming",
  amount: "649",
  billingCycle: "Monthly",
  nextRenewal: "2026-10-23",
  startDate: "2024-02-23",
  chargedTo: "card:card-1",
};

describe("readSubscriptionForm", () => {
  it("reads a new subscription, Active, with the name as its short name", () => {
    expect(readSubscriptionForm(filled, known, false)).toEqual({
      ok: true,
      input: { name: "Netflix Premium", alias: "Netflix Premium", category: "Streaming", amount: 649, billingCycle: "Monthly", billingAnchorDate: "2026-10-23", startDate: "2024-02-23", status: "Active", defaultPaidFromCardId: "card-1" },
    });
  });

  it("says what's missing in plain words, as the design does", () => {
    const result = readSubscriptionForm({ category: "", amount: "", billingCycle: "" }, known, false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toMatchObject({
      name: "Enter the subscription's name",
      category: "Choose a category",
      amount: "Enter what it costs each time it renews",
      billingCycle: "Choose how often it's billed",
      nextRenewal: "Enter its next renewal date",
      startDate: "Enter when it started",
    });
  });

  it("refuses a start after the next renewal, an unknown card, and a category off the list", () => {
    const result = readSubscriptionForm({ ...filled, startDate: "2026-11-01", chargedTo: "card:nope", category: "Entertainment" }, known, false);
    expect(result.ok ? {} : result.errors).toMatchObject({ startDate: "It can't start after its next renewal", chargedTo: "Choose one of your cards or accounts", category: "Choose a category" });
  });

  it("reads Status when editing, and asks for the cancelled-on date of a cancelled one", () => {
    expect(readSubscriptionForm({ ...filled, status: "Paused" }, known, true)).toMatchObject({ ok: true, input: { status: "Paused" } });
    const cancelled = readSubscriptionForm({ ...filled, status: "Cancelled" }, known, true);
    expect(cancelled.ok ? {} : cancelled.errors).toEqual({ endDate: "Enter when it was cancelled" });
    expect(readSubscriptionForm({ ...filled, status: "Cancelled", endDate: "2026-09-14" }, known, true)).toMatchObject({ ok: true, input: { status: "Cancelled", endDate: "2026-09-14" } });
  });

  it("lets a subscription cancelled without a date stay that way when it's edited", () => {
    const blank = readSubscriptionForm({ ...filled, status: "Cancelled", endDate: "" }, known, true, { endDateOptional: true });
    expect(blank.ok).toBe(true);
    expect(blank.ok ? blank.input.endDate : "not read").toBeUndefined();
    expect(readSubscriptionForm({ ...filled, status: "Cancelled", endDate: "" }, known, true).ok).toBe(false);
  });

  it("charges it to an account, or to nothing", () => {
    expect(readSubscriptionForm({ ...filled, chargedTo: "account:acc-1" }, known, false)).toMatchObject({ ok: true, input: { defaultPaidFromAccountId: "acc-1" } });
    const none = readSubscriptionForm({ ...filled, chargedTo: "" }, known, false);
    expect(none.ok && "defaultPaidFromCardId" in none.input).toBe(false);
  });
});

describe("readPaymentForm", () => {
  const payKnown = { ...known, subscriptionIds: ["sub-1"] };
  const pay = { subscriptionId: "sub-1", paymentDate: "2026-10-23", amount: "649", chargedTo: "card:card-1" };

  it("reads a payment, Paid, and the update-the-plan box", () => {
    expect(readPaymentForm({ ...pay, updatePlan: "1" }, payKnown)).toEqual({
      ok: true,
      input: { payment: { subscriptionId: "sub-1", paymentDate: "2026-10-23", amount: 649, status: "Paid", paidFromCardId: "card-1" }, updatePlan: true },
    });
    expect(readPaymentForm(pay, payKnown)).toMatchObject({ ok: true, input: { updatePlan: false } });
  });

  it("says what's missing, and refuses ₹0", () => {
    const empty = readPaymentForm({}, payKnown);
    expect(empty.ok ? {} : empty.errors).toMatchObject({ subscriptionId: "Choose the subscription", paymentDate: "Enter when it was paid", amount: "Enter what was charged" });
    const zero = readPaymentForm({ ...pay, amount: "0" }, payKnown);
    expect(zero.ok ? {} : zero.errors).toEqual({ amount: "Enter what was charged: a payment can't be ₹0" });
  });
});

describe("readDateForm", () => {
  it("reads the cancelled-on or starts-again date, not before it started", () => {
    expect(readDateForm({ endDate: "2026-09-14" }, "endDate", "2024-02-23")).toEqual({ ok: true, input: "2026-09-14" });
    expect(readDateForm({ resumedOn: "" }, "resumedOn")).toEqual({ ok: false, errors: { resumedOn: "Enter when it starts again" } });
    expect(readDateForm({ endDate: "2020-01-01" }, "endDate", "2024-02-23")).toEqual({ ok: false, errors: { endDate: "It can't be cancelled before it started" } });
  });
});

const sub: Subscription = { id: "sub-1", name: "iCloud+", alias: "iCloud+", category: "Cloud-Storage", amount: 219, billingCycle: "Monthly", billingAnchorDate: "2026-07-24", startDate: "2026-07-24", status: "Active", defaultPaidFromCardId: "card-1" };
const paid = (paymentDate: string): SubscriptionPayment => ({ id: paymentDate, subscriptionId: "sub-1", paymentDate, amount: 219, status: "Paid" });

describe("where the forms start", () => {
  it("records the oldest renewal not recorded first, then the next one to come", () => {
    // Sep 24 wasn't recorded: catching up on it comes first.
    expect(renewalToRecord(sub, [paid("2026-07-24"), paid("2026-08-24")], "2026-10-21")?.date).toBe("2026-09-24");
    expect(renewalToRecord(sub, [paid("2026-07-24"), paid("2026-08-24"), paid("2026-09-24")], "2026-10-21")?.date).toBe("2026-10-24");
    expect(renewalToRecord({ ...sub, status: "Paused" }, [paid("2026-07-24")], "2026-10-21")).toBeNull();
  });

  it("marks a renewal paid at the plan's price, on its date, to the usual card", () => {
    expect(markPaidPayment(sub, "2026-10-24")).toEqual({ subscriptionId: "sub-1", paymentDate: "2026-10-24", amount: 219, status: "Paid", paidFromCardId: "card-1" });
  });

  it("offers to update the plan only when the price is 2% or more off it", () => {
    expect(offPlan(249, 219)).toBe(true);
    expect(offPlan(220, 219)).toBe(false);
    expect(offPlan(100, 0)).toBe(true);
  });

  it("writes where something's charged as one value", () => {
    expect(chargedToValue({ defaultPaidFromCardId: "card-1" })).toBe("card:card-1");
    expect(chargedToValue({ paidFromAccountId: "acc-1" })).toBe("account:acc-1");
    expect(chargedToValue({})).toBe("");
  });
});

describe("anchorToSave", () => {
  const existing = { billingAnchorDate: "2026-01-31", billingCycle: "Monthly" as const, startDate: "2026-01-31" };

  it("keeps the stored anchor when the date shown is already on its schedule, so a 31st stays the 31st", () => {
    // The form shows Nov 30 (November's 31st): saving it unchanged mustn't move the schedule to the 30th.
    expect(anchorToSave(existing, { billingAnchorDate: "2026-11-30", billingCycle: "Monthly" })).toBe("2026-01-31");
    expect(anchorToSave(existing, { billingAnchorDate: "2026-02-28", billingCycle: "Monthly" })).toBe("2026-01-31");
  });

  it("takes the new date when it moves the schedule, or the cycle changes", () => {
    expect(anchorToSave(existing, { billingAnchorDate: "2026-11-15", billingCycle: "Monthly" })).toBe("2026-11-15");
    expect(anchorToSave(existing, { billingAnchorDate: "2026-11-30", billingCycle: "Yearly" })).toBe("2026-11-30");
  });
});
