import { describe, expect, it } from "vitest";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { formsView } from "./formsView";

// The design's "today": Netflix renews in 3 days, and iCloud+'s Sep 24 wasn't recorded.
const TODAY = "2026-10-20";
const forms = formsView(demoSubscriptionData(TODAY), TODAY, true);

describe("formsView", () => {
  it("offers Mark paid for a renewal due within 3 days, at the design's figures", () => {
    expect(forms.context["demo-netflix"]).toEqual({ renewalDate: "2026-10-23", after: "2026-11-23", markPaid: "2026-10-23", plan: 649, monthly: 649, paid: 16418, payments: 32, rows: 32, nextRenewal: "2026-10-23" });
  });

  it("starts Record a payment on a renewal not recorded, and offers no Mark paid for it", () => {
    expect(forms.context["demo-icloud"]).toMatchObject({ renewalDate: "2026-09-24", after: "2026-10-24", markPaid: null, paid: 3723, payments: 17 });
  });

  it("offers nothing to record for a paused one", () => {
    expect(forms.context["demo-headspace"]).toMatchObject({ renewalDate: null, markPaid: null, nextRenewal: null });
  });

  it("keeps a card a subscription is still charged to after it's closed, marked as no longer active", () => {
    const data = demoSubscriptionData(TODAY);
    const closed = formsView({ ...data, cards: data.cards.map((c) => (c.id === "demo-ace" ? { ...c, status: "Closed" as const } : c)) }, TODAY, true);
    expect(closed.cards.find((c) => c.id === "demo-ace")).toMatchObject({ name: "Ace", inactive: true });
  });

  it("lists the active cards and accounts to charge, and the monthly total", () => {
    expect(forms.cards.map((c) => `${c.name} ${c.color}`)).toEqual(["Millennia teal", "Ace violet", "Coral copper"]);
    expect(forms.accounts.map((a) => a.name)).toEqual(["Kotak Savings"]);
    expect(Math.round(forms.monthlyTotal)).toBe(5559);
    expect(forms.demo).toBe(true);
  });
});
