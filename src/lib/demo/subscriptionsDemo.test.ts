import { describe, expect, it } from "vitest";
import { yearSummary } from "../aggregate/subscriptionRenewals";
import { allFacts } from "../aggregate/subscriptionPage";
import { createSubscriptionPaymentSchema } from "../sheets/subscriptionPayments";
import { createSubscriptionSchema } from "../sheets/subscriptions";
import { demoSubscriptionData } from "./subscriptionsDemo";

// The design's "today".
const TODAY = "2026-10-20";

describe("demoSubscriptionData", () => {
  const data = demoSubscriptionData(TODAY);

  it("gives the design's figures: paid this year, the biggest month, and the monthly total", () => {
    const summary = yearSummary(data.subscriptions, data.payments, TODAY);
    expect(summary.paid).toBe(57163);
    expect(summary.biggestMonth).toEqual({ month: "2026-03", paid: 10032 });
    expect(Math.round(allFacts(data.subscriptions, data.payments, TODAY).monthly)).toBe(5559);
  });

  it("is valid as the Sheet would hold it", () => {
    // The create schemas ignore the id, and carry the cross-field checks the row schemas don't.
    for (const s of data.subscriptions) expect(createSubscriptionSchema.safeParse(s).success).toBe(true);
    for (const p of data.payments) expect(createSubscriptionPaymentSchema.safeParse(p).success).toBe(true);
  });

  it("records nothing after today, after a pause, or after a cancellation", () => {
    expect(data.payments.every((p) => p.paymentDate <= TODAY)).toBe(true);
    expect(data.payments.filter((p) => p.subscriptionId === "demo-headspace").at(-1)?.paymentDate).toBe("2026-07-12");
    expect(data.payments.some((p) => p.subscriptionId === "demo-icloud" && p.paymentDate === "2026-09-24")).toBe(false);
  });
});
