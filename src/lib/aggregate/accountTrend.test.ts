import { describe, expect, it } from "vitest";
import { flows, itemsBetween, type FlowItem } from "./accountFlows";
import { trendStats } from "./accountTrend";

const points = [
  { date: "2026-01-01", total: 1000 },
  { date: "2026-01-08", total: 1500 },
  { date: "2026-01-15", total: 900 },
  { date: "2026-01-22", total: 1200 },
];

describe("trendStats", () => {
  it("reads the whole line by default: the change, its fraction, and the high and low with their days", () => {
    expect(trendStats(points)).toEqual({
      from: "2026-01-01",
      to: "2026-01-22",
      start: 1000,
      end: 1200,
      change: 200,
      changeFraction: 0.2,
      high: { total: 1500, date: "2026-01-08" },
      low: { total: 900, date: "2026-01-15" },
      count: 4,
    });
  });

  it("reads a stretch from either end, both points included", () => {
    const forwards = trendStats(points, 1, 2);
    expect(forwards).toMatchObject({ from: "2026-01-08", to: "2026-01-15", change: -600, count: 2 });
    expect(forwards?.changeFraction).toBeCloseTo(-0.4);
    expect(trendStats(points, 2, 1)).toEqual(forwards);
  });

  it("clamps to the line, and has no fraction from ₹0", () => {
    expect(trendStats(points, -5, 99)).toMatchObject({ from: "2026-01-01", to: "2026-01-22" });
    expect(trendStats([{ date: "2026-01-01", total: 0 }, { date: "2026-01-08", total: 50 }])?.changeFraction).toBeNull();
  });

  it("is null with no points, and a single point has no change", () => {
    expect(trendStats([])).toBeNull();
    expect(trendStats([points[0]])).toMatchObject({ change: 0, count: 1 });
  });
});

describe("a stretch's money in and out", () => {
  const items: FlowItem[] = [
    { kind: "Came in", date: "2026-01-02", amount: 5000, accountId: "a" },
    { kind: "Card bills", date: "2026-01-08", amount: 700, accountId: "a" },
    { kind: "Investments", date: "2026-01-09", amount: 1000, accountId: "a" },
    { kind: "EMIs", date: "2026-01-12", amount: 300, accountId: "b" },
    { kind: "Subscriptions", date: "2026-01-20", amount: 100, accountId: "a" },
  ];

  it("takes what happened after the first reading up to the last one, a reading's own day belonging to the one that shows it", () => {
    const stretch = itemsBetween(items, "2026-01-08", "2026-01-15");
    expect(stretch.map((i) => i.date)).toEqual(["2026-01-09", "2026-01-12"]);
  });

  it("with no start, takes everything up to the end", () => {
    expect(itemsBetween(items, null, "2026-01-12")).toHaveLength(4);
  });

  it("adds a stretch up the way the page does: expenses are bills, subscriptions and EMIs, and what left the bank is those plus what was invested", () => {
    const f = flows(itemsBetween(items, null, "2026-01-31"), null);
    expect(f.cameIn).toBe(5000);
    expect(f.expenses).toBe(1100);
    expect(f.invested).toBe(1000);
    expect(f.expenses + f.invested).toBe(2100);
    expect(flows(itemsBetween(items, null, "2026-01-31"), "b").expenses).toBe(300);
  });
});

describe("a stretch of the line, against the period", () => {
  const items: FlowItem[] = [
    { kind: "Came in", date: "2026-01-01", amount: 1000, accountId: "a" },
    { kind: "Card bills", date: "2026-01-02", amount: 200, accountId: "a" },
    { kind: "Investments", date: "2026-01-09", amount: 300, accountId: "a" },
    { kind: "Subscriptions", date: "2026-01-22", amount: 50, accountId: "a" },
  ];
  const line = { first: "2026-01-01", last: "2026-01-22" };

  it("adds up the whole period when the stretch is the whole line, so measuring it all changes nothing", async () => {
    const { flowsOverStretch } = await import("./accountFlows");
    expect(flowsOverStretch(items, "a", line, "2026-01-01", "2026-01-22")).toEqual(flows(items, "a"));
  });

  it("leaves out what happened on the stretch's first day and before it, and after its last", async () => {
    const { flowsOverStretch } = await import("./accountFlows");
    const f = flowsOverStretch(items, "a", line, "2026-01-02", "2026-01-15");
    expect(f.cameIn).toBe(0);
    expect(f.expenses).toBe(0);
    expect(f.invested).toBe(300);
  });

  it("counts what left the account as expenses plus what was invested", () => {
    const f = flows(items, "a");
    expect(f.leftBank).toBe(550);
    expect(f.leftBank).toBe(f.expenses + f.invested);
  });
});
