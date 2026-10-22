import { describe, expect, it } from "vitest";
import { greetingView } from "./greetingView";
import { heatmapMonthDetails, pendingSummary, spendSummary, type SpendPeriod } from "../../lib/aggregate/cardSpend";
import { demoCardData } from "../../lib/demo/cardsDemo";

const TODAY = "2026-08-18";
const data = demoCardData(TODAY);
const thisYear = { kind: "year" as const, year: 2026 };

const view = (period: SpendPeriod, cardId?: string, source = data) =>
  greetingView(source, spendSummary(source, period, TODAY, cardId), heatmapMonthDetails(source, cardId), period, TODAY, cardId);

describe("greetingView", () => {
  const cards = view(thisYear);

  it("agrees with the sentence's figures", () => {
    const summary = spendSummary(data, thisYear, TODAY);
    expect(cards.spent?.total).toBe("₹2,39,700");
    expect(cards.average?.total).toBe("₹29,963");
    expect(cards.highest?.total).toBe("₹57,300");
    expect(cards.highest?.title).toBe("July 2026");
    expect(cards.pending?.total).toBe("₹50,900");
    expect(pendingSummary(data, TODAY).total).toBe(50900);
    expect(summary.total).toBe(239700);
  });

  it("draws the year's months, the rest of this year dashed, each month's bar adding up to its spend", () => {
    const months = cards.spent!.months;
    expect(months).toHaveLength(12);
    expect(months.filter((m) => m.future).map((m) => m.key)).toEqual(["2026-09", "2026-10", "2026-11", "2026-12"]);
    const summary = spendSummary(data, thisYear, TODAY);
    for (const m of summary.months) {
      const drawn = months.find((x) => x.key === m.month)!;
      expect(drawn.total).toBe(m.amount);
      expect(drawn.segments.reduce((sum, s) => sum + s.amount, 0)).toBe(m.amount);
    }
    expect(months.filter((m) => !m.future).reduce((sum, m) => sum + m.total, 0)).toBe(summary.total);
  });

  it("lists the pending bills soonest first, with how soon each is due", () => {
    expect(cards.pending?.title).toBe("2 pending bills");
    expect(cards.pending?.rows.map((r) => [r.name, r.amount, r.note])).toEqual([
      ["Amazon", "₹12,400", "Due Aug 23 · in 5 days"],
      ["Regalia", "₹38,500", "Due Aug 25 · in 7 days"],
    ]);
  });

  it("splits the highest month by card, largest first", () => {
    expect(cards.highest?.rows.map((r) => r.name)).toEqual(["Regalia", "Amazon"]);
    expect(cards.highest?.rows[0].fraction).toBe(1);
  });

  it("names the colours of the cards that spent, for the legend", () => {
    expect(cards.spent?.legend.map((l) => l.name)).toEqual(["Regalia", "Amazon"]);
  });

  it("is one card's own when one is selected: a single colour, no legend, no split", () => {
    const one = view(thisYear, "demo-regalia");
    expect(one.spent?.total).toBe("₹1,73,900");
    expect(one.spent?.legend).toEqual([]);
    expect(one.highest?.rows).toEqual([]);
    const segments = one.spent!.months.flatMap((m) => m.segments);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((s) => s.cardId === "demo-regalia")).toBe(true);
    expect(one.pending?.rows).toHaveLength(1);
  });

  it("has no cards for a period with no statements, but still the pending bills", () => {
    const empty = view({ kind: "year", year: 2020 });
    expect(empty.spent).toBeUndefined();
    expect(empty.average).toBeUndefined();
    expect(empty.highest).toBeUndefined();
    expect(empty.pending?.rows).toHaveLength(2);
  });

  it("flags a bill due within 3 days or overdue as urgent, and says what's been part-paid", () => {
    const soon = { ...data, statements: data.statements.map((s) => (s.status === "Pending" && s.cardId === "demo-amazon" ? { ...s, dueDate: "2026-08-20", amountPaid: 2400 } : s)) };
    const row = view(thisYear, undefined, soon).pending!.rows.find((r) => r.name === "Amazon")!;
    expect(row.urgent).toBe(true);
    expect(row.note).toBe("Due Aug 20 · in 2 days · ₹2,400 paid");
    expect(row.amount).toBe("₹10,000");
  });
});

describe("greetingView overdue bills", () => {
  it("says since when, once", () => {
    const late = { ...data, statements: data.statements.map((s) => (s.status === "Pending" && s.cardId === "demo-amazon" ? { ...s, dueDate: "2026-08-15" } : s)) };
    const row = view(thisYear, undefined, late).pending!.rows.find((r) => r.name === "Amazon")!;
    expect(row.note).toBe("Overdue since Aug 15");
    expect(row.urgent).toBe(true);
  });
});
