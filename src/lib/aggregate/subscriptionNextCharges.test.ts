import { describe, expect, it } from "vitest";
import type { Subscription, SubscriptionPayment } from "../sheets/types";
import { nextRenewalsFrom, nextStatementCharges } from "./subscriptionNextCharges";

const sub = (over: Partial<Subscription> & Pick<Subscription, "id">): Subscription => ({
  name: over.id,
  alias: over.id,
  category: "Software",
  amount: 100,
  billingCycle: "Monthly",
  billingAnchorDate: "2026-01-08",
  startDate: "2026-01-08",
  status: "Active",
  ...over,
});
const paid = (subscriptionId: string, paymentDate: string, amount: number, paidFromCardId?: string): SubscriptionPayment => ({ id: `${subscriptionId}-${paymentDate}`, subscriptionId, paymentDate, amount, status: "Paid", ...(paidFromCardId ? { paidFromCardId } : {}) });
const coral = { id: "coral", statementDay: 2, dueDayBuffer: 20 };
/** The charges without their keys, which only need to be unique. */
const plain = <T extends { key: string }>(charges: T[]) =>
  charges.map((c) => {
    const rest: Partial<T> = { ...c };
    delete rest.key;
    return rest;
  });
const TODAY = "2026-10-20";

describe("a card's next statement", () => {
  it("covers the day after its last statement up to its next one", () => {
    expect(nextStatementCharges(coral, [], [], TODAY)).toMatchObject({ opens: "2026-10-03", closes: "2026-11-02", charges: [], total: 0 });
  });

  it("closes today when today is its statement day", () => {
    expect(nextStatementCharges(coral, [], [], "2026-11-02")).toMatchObject({ opens: "2026-10-03", closes: "2026-11-02" });
  });

  it("adds what's already charged to the card since then and the renewals still to come on it", () => {
    // ChatGPT renews on the 8th (paid Oct 8 on Coral); Times Prime renews Oct 30, not paid yet.
    const chatgpt = sub({ id: "chatgpt", amount: 1999, defaultPaidFromCardId: "coral" });
    const times = sub({ id: "times", amount: 1199, billingCycle: "Yearly", billingAnchorDate: "2024-10-30", startDate: "2024-10-30", defaultPaidFromCardId: "coral" });
    const payments = [paid("chatgpt", "2026-09-08", 1999, "coral"), paid("chatgpt", "2026-10-08", 1999, "coral"), paid("times", "2025-10-30", 1199, "coral")];
    const next = nextStatementCharges(coral, [chatgpt, times], payments, TODAY);
    expect(plain(next.charges)).toEqual([
      { subscriptionId: "chatgpt", date: "2026-10-08", amount: 1999, paid: true },
      { subscriptionId: "times", date: "2026-10-30", amount: 1199, paid: false },
    ]);
    expect(next.total).toBe(3198);
  });

  it("counts a payment by the card it went on, not the subscription's usual card", () => {
    const netflix = sub({ id: "netflix", amount: 649, billingAnchorDate: "2026-01-10", startDate: "2026-01-10", defaultPaidFromCardId: "millennia" });
    const next = nextStatementCharges(coral, [netflix], [paid("netflix", "2026-10-10", 649, "coral")], TODAY);
    expect(plain(next.charges)).toEqual([{ subscriptionId: "netflix", date: "2026-10-10", amount: 649, paid: true }]);
  });

  it("leaves out a renewal that passed without being recorded, and counts one paid early once", () => {
    // Renews on the 5th: Oct 5 passed with no payment; Nov 5 is after the statement.
    const missed = sub({ id: "missed", amount: 300, billingAnchorDate: "2026-01-05", startDate: "2026-01-05", defaultPaidFromCardId: "coral" });
    // Renews Oct 28, paid early on Oct 18.
    const early = sub({ id: "early", amount: 500, billingAnchorDate: "2026-01-28", startDate: "2026-01-28", defaultPaidFromCardId: "coral" });
    const next = nextStatementCharges(coral, [missed, early], [paid("early", "2026-10-18", 500, "coral")], TODAY);
    expect(plain(next.charges)).toEqual([{ subscriptionId: "early", date: "2026-10-18", amount: 500, paid: true }]);
  });

  it("adds nothing for a paused or cancelled subscription", () => {
    const paused = sub({ id: "paused", status: "Paused", billingAnchorDate: "2026-01-25", startDate: "2026-01-25", defaultPaidFromCardId: "coral" });
    const cancelled = sub({ id: "cancelled", status: "Cancelled", endDate: "2026-12-31", billingAnchorDate: "2026-01-25", startDate: "2026-01-25", defaultPaidFromCardId: "coral" });
    expect(nextStatementCharges(coral, [paused, cancelled], [], TODAY).charges).toEqual([]);
  });

  it("counts a renewal on the statement date itself, and leaves one the day after for the next statement", () => {
    const onTheDay = sub({ id: "on", billingAnchorDate: "2026-01-02", startDate: "2026-01-02", defaultPaidFromCardId: "coral" });
    const dayAfter = sub({ id: "after", billingAnchorDate: "2026-01-03", startDate: "2026-01-03", defaultPaidFromCardId: "coral" });
    expect(plain(nextStatementCharges(coral, [onTheDay, dayAfter], [], TODAY).charges)).toEqual([{ subscriptionId: "on", date: "2026-11-02", amount: 100, paid: false }]);
  });

  it("closes on a short month's last day for a statement day past it", () => {
    const late = { id: "late", statementDay: 31, dueDayBuffer: 20 };
    expect(nextStatementCharges(late, [], [], "2027-02-10")).toMatchObject({ opens: "2027-02-01", closes: "2027-02-28" });
    expect(nextStatementCharges(late, [], [], "2028-02-10")).toMatchObject({ opens: "2028-02-01", closes: "2028-02-29" });
  });

  it("counts a Pending payment by the card it's on and its date, as still to come, even once its date has passed", () => {
    const chatgpt = sub({ id: "chatgpt", amount: 1999, billingAnchorDate: "2026-01-18", startDate: "2026-01-18", defaultPaidFromCardId: "coral" });
    const pending: SubscriptionPayment = { id: "p1", subscriptionId: "chatgpt", paymentDate: "2026-10-18", amount: 1999, status: "Pending", paidFromCardId: "millennia" };
    expect(nextStatementCharges(coral, [chatgpt], [pending], TODAY).charges).toEqual([]);
    const millennia = { id: "millennia", statementDay: 6, dueDayBuffer: 20 };
    expect(plain(nextStatementCharges(millennia, [chatgpt], [pending], TODAY).charges)).toEqual([{ subscriptionId: "chatgpt", date: "2026-10-18", amount: 1999, paid: false }]);
  });

  it("keys each charge uniquely, even two payments on one day", () => {
    const twice = sub({ id: "twice", amount: 300, billingAnchorDate: "2026-01-10", startDate: "2026-01-10", defaultPaidFromCardId: "coral" });
    const payments = [
      { id: "a", subscriptionId: "twice", paymentDate: "2026-10-10", amount: 300, status: "Paid" as const, paidFromCardId: "coral" },
      { id: "b", subscriptionId: "twice", paymentDate: "2026-10-10", amount: 300, status: "Paid" as const, paidFromCardId: "coral" },
    ];
    const keys = nextStatementCharges(coral, [twice], payments, TODAY).charges.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("a bank account's next renewals", () => {
  it("lists the next few still to come, soonest first", () => {
    const swiggy = sub({ id: "swiggy", amount: 549, billingCycle: "Quarterly", billingAnchorDate: "2025-09-01", startDate: "2025-09-01", defaultPaidFromAccountId: "kotak" });
    const cult = sub({ id: "cult", amount: 4500, billingCycle: "Quarterly", billingAnchorDate: "2026-01-10", startDate: "2026-01-10", defaultPaidFromAccountId: "kotak" });
    expect(plain(nextRenewalsFrom([cult, swiggy], [], TODAY, 3))).toEqual([
      { subscriptionId: "swiggy", date: "2026-12-01", amount: 549, paid: false },
      { subscriptionId: "cult", date: "2027-01-10", amount: 4500, paid: false },
      { subscriptionId: "swiggy", date: "2027-03-01", amount: 549, paid: false },
    ]);
  });
});
