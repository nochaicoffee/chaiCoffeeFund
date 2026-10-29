import { describe, expect, it } from "vitest";
import { demoInsuranceData, type DemoVariant } from "@/lib/demo/insuranceDemo";
import type { Policy, PolicyPayment } from "@/lib/sheets/types";
import { ALL, pickIds, type InsuranceData } from "./views";
import { paymentsPageView, comingUpView, costView, detailsView, insuranceWidgets, ncbView, paymentsView, runwayView, tableView, timelineView } from "./widgetsView";

const TODAY = "2026-10-29";
const demo = (variant: DemoVariant = "") => demoInsuranceData(TODAY, variant);

describe("the premium runway", () => {
  it("shows a premium paid once for three years as one tall bar, and a renewal still to come as dashed", () => {
    const all = runwayView(demo(), TODAY).ranges.all;
    const items = all.months.flatMap((m) => m.items);
    const health = items.find((i) => i.policyId === "demo-health" && i.paid)!;
    expect(health.amount).toBeCloseTo(38427.59, 2);
    expect(health.note).toContain("3 years");
    expect(items.filter((i) => i.policyId === "demo-health")).toHaveLength(2);
    expect(items.find((i) => i.policyId === "demo-accident" && !i.paid)?.amount).toBe(451);
    expect(Math.max(...all.months.map((m) => m.total))).toBeCloseTo(38427.59, 2);
  });

  it("counts every paid premium of the year once: what left is more than a year of cover", () => {
    const view = runwayView(demo(), TODAY);
    const paid = view.ranges.all.months.filter((m) => m.key.startsWith("2026")).flatMap((m) => m.items.filter((i) => i.paid));
    expect(paid.reduce((t, i) => t + i.amount, 0)).toBeCloseTo(49623.59, 2);
    expect(view.monthlyText).toBe("₹1,709 a month if spread evenly");
    expect(view.note).toContain("₹49,624 left against ₹20,511 a year of cover");
    expect(view.note).toContain("paid once for 3 years");
  });

  it("starts the next-twelve view in this month and marks it as now", () => {
    const next = runwayView(demo(), TODAY).ranges.next;
    expect(next.months).toHaveLength(12);
    expect(next.months[0].key).toBe("2026-10");
    expect(next.months[0].now).toBe(true);
  });
});

describe("coming up", () => {
  it("lists live policies by renewal date with the last premium and the no-claim step", () => {
    const view = comingUpView(demo(), TODAY);
    expect(view.rows.map((r) => r.policyId)).toEqual(["demo-accident", "demo-car", "demo-bike", "demo-health"]);
    expect(view.rows[1].detail).toContain("NCB 50% → 50%");
    expect(view.rows[2].detail).toContain("for 3 years");
    expect(view.foot).toBe("Next 90 days: nothing falls due");
  });

  it("marks a renewal within a month and totals the next 90 days", () => {
    const view = comingUpView(demo("soon"), TODAY);
    expect(view.rows[0]).toMatchObject({ policyId: "demo-accident", soon: true, when: "in 12 days" });
    expect(view.foot).toBe("Next 90 days: ₹451 from 1 renewal");
    expect(runwayView(demo(), TODAY).monthShare).toBeCloseTo(29 / 31, 5);
  });
});

describe("the policies table", () => {
  it("gives a row to every policy, with a single premium shown once and spread over its years", () => {
    const rows = tableView(demo(), TODAY).rows;
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ paid: "₹38,428", paidSub: "once, for 3 years", year: "₹12,809" });
    expect(rows[1]).toMatchObject({ paidSub: "for the year", renewsTone: "plain" });
  });

  it("keeps a lapsed policy in the table with no year of cover, and says how long ago", () => {
    const car = tableView(demo("lapsed"), TODAY).rows.find((r) => r.id === "demo-car")!;
    expect(car).toMatchObject({ year: "—", renewsTone: "lapsed", state: "Lapsed" });
    expect(car.termSub).toBe("Lapsed 9 days ago");
  });
});

describe("premiums paid", () => {
  it("lists every term newest first, and where each was paid from", () => {
    const view = paymentsView(demo(), TODAY, ALL);
    expect(view.rows).toHaveLength(4);
    expect(view.rows[0].policyId).toBe("demo-health");
    expect(view.rows.find((r) => r.policyId === "demo-health")?.from).toBe("HDFC Salary");
    expect(view.rows.find((r) => r.policyId === "demo-bike")?.from).toBe("HDFC Regalia (card)");
    expect(view.rows.find((r) => r.policyId === "demo-car")?.from).toBeNull();
    expect(view.tiles).toBeNull();
  });

  it("follows the pick: one policy's terms, with what it has cost in all", () => {
    const view = paymentsView(demo(), TODAY, "demo-health");
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0].change).toEqual({ text: "first", tone: "first" });
    expect(view.tiles).toEqual([
      { label: "Paid in all", value: "₹38,428" },
      { label: "Years of cover bought", value: "3" },
      { label: "A year of it", value: "₹12,809" },
    ]);
  });

  it("compares a term's cost of a year with the term before, so three years at once isn't three times dearer", () => {
    const data = demo();
    const renewed: InsuranceData = {
      ...data,
      payments: [...data.payments, { id: "car-t0", policyId: "demo-car", periodStart: "2025-08-06", years: 1, amount: 5000, status: "Paid", paidOn: "2025-08-06" }],
    };
    const rows = paymentsView(renewed, TODAY, "demo-car").rows;
    expect(rows.map((r) => r.change.text)).toEqual(["+10%", "first"]);
    expect(rows[0].change.tone).toBe("up");
  });
});

describe("policy details", () => {
  it("shows the next to renew under All, and each policy under its own pick", () => {
    const details = detailsView(demo(), TODAY);
    expect(details[ALL]).toMatchObject({ policyId: "demo-accident", note: "Showing the next to renew" });
    expect(details["demo-health"]?.fields.find((f) => f.key === "paid")?.value).toBe("₹38,428 once, ₹12,809 a year");
    expect(details["demo-health"]?.addOns).toEqual(["Health 360 Shield", "Health 360 OPD", "Cumulative bonus 15%"]);
    expect(details["demo-car"]?.fields.find((f) => f.key === "ncb")?.value).toBe("50% now, the top step");
  });

  it("says Not recorded, quietly, for what isn't entered, and never carries a whole policy number", () => {
    const data = demo();
    const withNumber: InsuranceData = { ...data, policies: data.policies.map((p) => ({ ...p, policyNumber: "ZXCV1234567890", documentUrl: p.id === "demo-car" ? "https://example.com/car.pdf" : undefined })) };
    const details = detailsView(withNumber, TODAY);
    expect(details["demo-car"]?.fields.find((f) => f.key === "number")?.value).toBe("…7890");
    expect(details["demo-car"]?.fields.find((f) => f.key === "doc")).toMatchObject({ href: "https://example.com/car.pdf" });
    expect(JSON.stringify(insuranceWidgets(withNumber, TODAY, pickIds(withNumber)))).not.toContain("1234567");
    expect(details["demo-health"]?.fields.find((f) => f.key === "doc")).toMatchObject({ value: "Not recorded", quiet: true });
    expect(detailsView(demo("empty"), TODAY)[ALL]).toBeNull();
  });
});

describe("the timeline, no-claim bonus and cost", () => {
  it("draws each term as a bar on one axis, today inside it", () => {
    const view = timelineView(demo(), TODAY);
    expect(view.rows).toHaveLength(4);
    expect(view.years[0].label).toBe("2026");
    expect(view.nowAt).toBeGreaterThan(0);
    expect(view.nowAt).toBeLessThan(100);
    const health = view.rows[0].bars[0];
    const accident = view.rows[1].bars[0];
    expect(health.width).toBeGreaterThan(accident.width * 2.5);
    expect(view.note).toContain("A single premium buys the whole bar");
  });

  it("puts a motor policy on the ladder at its step, and says the next one", () => {
    const view = ncbView(demo(), TODAY)!;
    expect(view.rows.map((r) => [r.id, r.now, r.next])).toEqual([["demo-car", 50, 50], ["demo-bike", 0, 20]]);
    expect(view.rows[1].steps.map((s) => s.state)).toEqual(["now", "next", "todo", "todo", "todo", "todo"]);
    expect(view.rows[0].text).toBe("50% now, the top step");
  });

  it("has no ladder without a motor policy with a step", () => {
    const data = demo();
    const noMotor: InsuranceData = { ...data, policies: data.policies.filter((p) => p.kind !== "Motor") };
    expect(ncbView(noMotor, TODAY)).toBeNull();
  });

  it("prices each policy against its cover, and the shares add up to the whole", () => {
    const view = costView(demo(), TODAY)!;
    expect(view.rows.find((r) => r.id === "demo-health")?.rate).toBe("0.26%");
    expect(view.rows.reduce((t, r) => t + r.share, 0)).toBeCloseTo(1, 6);
    expect(view.yearText).toBe("₹20,511 a year");
    expect(costView(demo("empty"), TODAY)).toBeNull();
  });
});

const policy = (over: Partial<Policy> & Pick<Policy, "id">): Policy => ({ name: "Plan", kind: "Motor", insurer: "Insurer", covers: "Car", sumInsured: 400000, status: "Active", ...over });
const term = (over: Partial<PolicyPayment> & Pick<PolicyPayment, "id" | "policyId" | "periodStart">): PolicyPayment => ({ years: 1, amount: 5000, status: "Paid", ...over });
const book = (policies: Policy[], payments: PolicyPayment[]): InsuranceData => ({ policies, payments, loans: [], accounts: [], cards: [] });

describe("a policy with a history", () => {
  const renewed = book([policy({ id: "c" })], [term({ id: "t1", policyId: "c", periodStart: "2025-08-06", amount: 5000, ncb: 20 }), term({ id: "t2", policyId: "c", periodStart: "2026-08-06", amount: 5500, ncb: 25 })]);

  it("draws a bar for each term in its row, one after the other", () => {
    const [row] = timelineView(renewed, TODAY).rows;
    expect(row.bars).toHaveLength(2);
    expect(row.bars[0].left + row.bars[0].width).toBeCloseTo(row.bars[1].left, 1);
    expect(paymentsView(renewed, TODAY, ALL).rows.map((r) => r.change.text)).toEqual(["+10%", "first"]);
  });

  it("stops a cancelled policy's cover on the day it was cancelled", () => {
    const cancelled = book([policy({ id: "c", status: "Cancelled", endedOn: "2026-10-01" })], renewed.payments);
    const [row] = timelineView(cancelled, TODAY).rows;
    const full = timelineView(renewed, TODAY).rows[0].bars[1];
    expect(row.bars[1].width).toBeLessThan(full.width);
    const early = book([policy({ id: "c", status: "Cancelled", endedOn: "2025-12-01" })], renewed.payments);
    expect(timelineView(early, TODAY).rows[0].bars).toHaveLength(1);
  });

  it("says when the next term starts for a policy lapsed before it, not 'in N days'", () => {
    const gap = book([policy({ id: "c" })], [term({ id: "t1", policyId: "c", periodStart: "2025-09-01" }), term({ id: "t2", policyId: "c", periodStart: "2026-11-15" })]);
    expect(tableView(gap, TODAY).rows[0]).toMatchObject({ renewsTone: "lapsed", renewsSub: "next term starts Nov 15" });
  });
});

describe("coming up with many policies", () => {
  it("keeps every renewal for the switch to filter, in date order", () => {
    const policies = Array.from({ length: 8 }, (_, k) => policy({ id: `p${k}`, covers: `Thing ${k}` }));
    const payments = policies.map((p, k) => term({ id: `t${k}`, policyId: p.id, periodStart: `2025-11-${String(k + 1).padStart(2, "0")}` }));
    const rows = comingUpView(book(policies, payments), TODAY).rows;
    expect(rows).toHaveLength(8);
    expect(rows.filter((r) => !r.soon)).toHaveLength(8 - rows.filter((r) => r.soon).length);
    expect(rows.map((r) => r.policyId)).toEqual(policies.map((p) => p.id));
  });
});

describe("the payments page", () => {
  it("has a section for each policy with every term, and says what was paid in all and this year", () => {
    const view = paymentsPageView(demo(), TODAY);
    expect(view.sections.map((s) => s.id)).toEqual(["demo-health", "demo-accident", "demo-car", "demo-bike"]);
    expect(view.sections.every((s) => s.open)).toBe(true);
    expect(view.sections[0].summary).toBe("1 payment · ₹38,428 paid in all · 3 years of cover");
    expect(view.sections[0].rows[0]).toMatchObject({ amount: "₹38,428", from: "HDFC Salary" });
    expect(view.sentence).toContain("4 premiums paid, ₹49,624 in all. ₹49,624 left in 2026");
    expect(view.sentence).toContain("dated by the day cover began");
  });

  it("shows one policy, open, when one is picked, and nothing with no policies", () => {
    const one = paymentsPageView(demo(), TODAY, "demo-car");
    expect(one.sections).toHaveLength(1);
    expect(one.sections[0].open).toBe(true);
    expect(one.sections[0].rows[0].ncb).toBe("50%");
    expect(paymentsPageView(demo("empty"), TODAY)).toEqual({ sections: [], sentence: "No premium is recorded yet." });
  });

  it("lists a renewed policy's terms newest first, each against the one before", () => {
    const rows = paymentsPageView(demo("renewed"), TODAY, "demo-accident").sections[0].rows;
    expect(rows).toHaveLength(2);
    expect(rows[0].change.text).toBe("+4.9%");
    expect(rows[1].change.text).toBe("first");
  });
});

describe("with nothing recorded", () => {
  it("builds every widget empty without failing", () => {
    const widgets = insuranceWidgets(demo("empty"), TODAY, [ALL]);
    expect(widgets.table.rows).toEqual([]);
    expect(widgets.comingUp.rows).toEqual([]);
    expect(widgets.payments[ALL].rows).toEqual([]);
    expect(widgets.timeline.rows).toEqual([]);
    expect(widgets.cost).toBeNull();
    expect(widgets.ncb).toBeNull();
  });
});
