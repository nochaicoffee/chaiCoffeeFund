import { describe, expect, it } from "vitest";
import { sentenceText } from "@/app/cards/summarySentence";
import { demoInsuranceData } from "@/lib/demo/insuranceDemo";
import type { Policy, PolicyPayment } from "@/lib/sheets/types";
import { ALL, attentionView, coverView, greetingView, pickIds, summarySentence, type InsuranceData } from "./views";

const TODAY = "2026-10-29";

const policy = (over: Partial<Policy> & Pick<Policy, "id">): Policy => ({ name: "Plan", kind: "Health", insurer: "Insurer", covers: "You", sumInsured: 500000, status: "Active", ...over });
const term = (over: Partial<PolicyPayment> & Pick<PolicyPayment, "id" | "policyId" | "periodStart">): PolicyPayment => ({ years: 1, amount: 12000, status: "Paid", ...over });

const points = (parts: ReturnType<typeof summarySentence>) => [...new Set(parts.filter((p) => p.point).map((p) => p.point as string))];

describe("the greeting", () => {
  for (const variant of ["", "soon", "lapsed"] as const) {
    it(`gives every figure in the sentence a card, and every card a figure (demo ${variant || "plain"})`, () => {
      const data = demoInsuranceData(TODAY, variant);
      expect(points(summarySentence(data, TODAY)).sort()).toEqual(Object.keys(greetingView(data, TODAY)).sort());
    });
  }

  it("reads as the design's sentence for the sample policies", () => {
    const text = sentenceText(summarySentence(demoInsuranceData(TODAY), TODAY));
    expect(text).toMatch(/^You're covered by 4 policies: ₹50\.0L of health cover, ₹15\.0L of accident cover, and the car and bike insured up to ₹4\.4L and ₹73\.5k\./);
    expect(text).toContain("A year of cover costs ₹20,511, ₹1,709 a month");
    expect(text).toContain("left your accounts this year because the health and bike cover were bought for three years at once");
    expect(text).toContain("The next renewal is the accident cover on");
    expect(text).toContain("Your Home loan has no policy recorded.");
  });

  it("leaves a figure with nothing behind it plain: no cards without cover in force, no 'paid' card before anything is paid", () => {
    const lapsedOnly: InsuranceData = { policies: [policy({ id: "p" })], payments: [term({ id: "t", policyId: "p", periodStart: "2024-01-01" })], loans: [] };
    expect(greetingView(lapsedOnly, TODAY)).toEqual({});
    expect(points(summarySentence(lapsedOnly, TODAY))).toEqual([]);
    expect(sentenceText(summarySentence(lapsedOnly, TODAY))).toContain("Nothing is in force right now. The health cover lapsed");

    const unpaid: InsuranceData = { policies: [policy({ id: "p" })], payments: [term({ id: "t", policyId: "p", periodStart: "2025-12-01", paidOn: "2025-11-20" })], loans: [] };
    expect(Object.keys(greetingView(unpaid, TODAY))).not.toContain("paid");
    expect(points(summarySentence(unpaid, TODAY))).not.toContain("paid");
  });

  it("says there are no policies yet, with nothing to point at", () => {
    const empty = demoInsuranceData(TODAY, "empty");
    expect(sentenceText(summarySentence(empty, TODAY))).toMatch(/^No policies yet\./);
    expect(greetingView(empty, TODAY)).toEqual({});
  });

  it("adds up the paid-this-year card to the sentence's figure", () => {
    const data = demoInsuranceData(TODAY);
    const card = greetingView(data, TODAY).paid!;
    expect(card.total).toBe("₹49,624");
    expect(card.rows).toHaveLength(4);
  });

  it("mentions a lapsed policy and names it by what it covers", () => {
    const text = sentenceText(summarySentence(demoInsuranceData(TODAY, "lapsed"), TODAY));
    expect(text).toContain("The car cover lapsed 9 days ago.");
  });
});

describe("review fixes", () => {
  const two: InsuranceData = {
    policies: [policy({ id: "a", kind: "Motor", covers: "Car" }), policy({ id: "b", kind: "Health", covers: "you" }), policy({ id: "c", kind: "Accident", covers: "You " })],
    payments: [term({ id: "ta", policyId: "a", periodStart: "2025-10-20" }), term({ id: "tb", policyId: "b", periodStart: "2025-09-19" }), term({ id: "tc", policyId: "c", periodStart: "2026-03-21" })],
    loans: [{ id: "l", name: "SBI Home Loan", lenderName: "SBI", category: "Home", status: "Active" }],
  };

  it("gives each lapsed policy its own days, and writes a loan's name as it is", () => {
    const text = sentenceText(summarySentence(two, TODAY));
    expect(text).toContain("The car cover lapsed 9 days ago and the health cover lapsed 40 days ago.");
    expect(text).toContain("Your SBI Home Loan has no policy recorded.");
  });

  it("groups what a policy covers without regard to case or spaces", () => {
    expect(coverView(two, TODAY).tiles.map((t) => [t.name, t.boxes.length])).toEqual([["you", 2], ["Car", 1], ["Home", 0]]);
  });

  it("describes a term that hasn't started as starting, not as days left", () => {
    const later: InsuranceData = { policies: [policy({ id: "p" })], payments: [term({ id: "t", policyId: "p", periodStart: "2026-11-15" })], loans: [] };
    const [box] = coverView(later, TODAY).tiles[0].boxes;
    expect(box.footLeft).toBe("Starts Nov 15");
    expect(box.tip.total).toBe("Starts Nov 15");
  });
});

describe("the attention strip", () => {
  it("is empty when nothing is due within a month and nothing has lapsed", () => {
    expect(attentionView(demoInsuranceData(TODAY), TODAY)).toEqual([]);
  });

  it("shows a policy renewing within a month in amber with its last premium", () => {
    const [item, ...rest] = attentionView(demoInsuranceData(TODAY, "soon"), TODAY);
    expect(rest).toEqual([]);
    expect(item).toMatchObject({ policyId: "demo-accident", tone: "soon" });
    expect(item.text).toContain("in 12 days");
    expect(item.text).toContain("Last paid ₹451");
  });

  it("shows a lapsed policy in red before the ones renewing soon, with what it means for a vehicle", () => {
    const data = demoInsuranceData(TODAY, "lapsed");
    const items = attentionView(data, TODAY);
    expect(items[0]).toMatchObject({ policyId: "demo-car", tone: "lapsed" });
    expect(items[0].text).toContain("9 days ago");
    expect(items[0].text).toContain("Driving without cover is illegal");
  });

  it("says when the next term is already recorded for a later start, instead of 'no renewal'", () => {
    const data: InsuranceData = {
      policies: [policy({ id: "p", kind: "Motor", covers: "Car" })],
      payments: [term({ id: "t1", policyId: "p", periodStart: "2025-09-01" }), term({ id: "t2", policyId: "p", periodStart: "2026-11-15" })],
      loans: [],
    };
    const [item] = attentionView(data, TODAY);
    expect(item.tone).toBe("lapsed");
    expect(item.text).toContain("The next term starts Nov 15, 2026.");
    expect(item.text).not.toContain("No renewal is recorded");
  });
});

describe("the cover map", () => {
  it("groups the policies by what they cover, You first, with a tile for a loan that has none", () => {
    const view = coverView(demoInsuranceData(TODAY), TODAY);
    expect(view.tiles.map((t) => t.name)).toEqual(["You", "Car", "Bike", "Home"]);
    expect(view.tiles[0].boxes.map((b) => b.id)).toEqual(["demo-health", "demo-accident"]);
    expect(view.tiles[0].yearly).toBe("₹13,260");
    expect(view.tiles[3].gap?.text).toContain("SBI's home loan");
    expect(view.count).toBe(4);
    expect(view.delta).toEqual({ text: "nothing has lapsed", tone: "ok" });
  });

  it("shows the cover of each kind, and each vehicle's IDV on its own", () => {
    const view = coverView(demoInsuranceData(TODAY), TODAY);
    expect(view.figures.map((f) => [f.label, f.value])).toEqual([
      ["Health cover", "₹50.0L"],
      ["Accident cover", "₹15.0L"],
      ["Car insured up to", "₹4.4L"],
      ["Bike insured up to", "₹73.5k"],
    ]);
  });

  it("marks a policy renewing soon or lapsed, and counts the lapsed one out of 'in force'", () => {
    const soon = coverView(demoInsuranceData(TODAY, "soon"), TODAY);
    expect(soon.tiles[0].boxes[1]).toMatchObject({ badge: "soon", warn: true, footLeft: "12 days left" });
    const lapsed = coverView(demoInsuranceData(TODAY, "lapsed"), TODAY);
    expect(lapsed.count).toBe(3);
    expect(lapsed.delta).toEqual({ text: "1 has lapsed", tone: "bad" });
    expect(lapsed.tiles[1].boxes[0]).toMatchObject({ badge: "lapsed", warn: true, footLeft: "Lapsed 9 days ago" });
  });

  it("describes a term as it is: a single premium for years, and how much of the term has gone by", () => {
    const health = coverView(demoInsuranceData(TODAY), TODAY).tiles[0].boxes[0];
    expect(health.costLeft).toBe("₹38,428 once");
    expect(health.costRight).toBe("₹12,809 a year");
    expect(health.footLeft).toBe("2.9 years left");
    expect(health.tip.head).toBe("Lifetime Health · term 1 of 1");
    expect(health.tip.rows.map((r) => r.name)).toEqual(["Gone by", "Paid", "Renews on"]);
  });

  it("picks all policies or any one, even a lapsed one", () => {
    const data = demoInsuranceData(TODAY, "lapsed");
    expect(pickIds(data)).toEqual([ALL, "demo-health", "demo-accident", "demo-car", "demo-bike"]);
    expect(coverView(data, TODAY).picks).toEqual(pickIds(data));
  });
});

describe("privacy", () => {
  it("carries no policy number into anything the page sends to the browser", () => {
    const data = demoInsuranceData(TODAY, "soon");
    const withNumber: InsuranceData = { ...data, policies: data.policies.map((p) => ({ ...p, policyNumber: "ZXCV9876543210" })) };
    const everything = JSON.stringify([summarySentence(withNumber, TODAY), greetingView(withNumber, TODAY), attentionView(withNumber, TODAY), coverView(withNumber, TODAY)]);
    expect(everything).not.toContain("9876543210");
    expect(everything).not.toContain("3210");
    expect(everything).not.toContain("policyNumber");
  });
});
