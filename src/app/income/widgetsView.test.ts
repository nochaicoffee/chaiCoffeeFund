import { describe, expect, it } from "vitest";
import { demoIncomeData } from "@/lib/demo/incomeDemo";
import { ALL } from "./views";
import { entriesCard, incomeHeatmap, incomeMap } from "./widgetsView";

const TODAY = "2026-10-24";
const data = demoIncomeData(TODAY);

describe("incomeHeatmap", () => {
  const heat = incomeHeatmap(data, TODAY, 2026, ALL);

  it("shows the year and the one before, newest first, twelve months each", () => {
    expect(heat.rows.map((r) => r.year)).toEqual([2026, 2025]);
    expect(heat.rows.every((r) => r.cells.length === 12)).toBe(true);
  });

  it("shades months against the biggest one shown, and marks March as the peak", () => {
    const march = heat.rows[0].cells[2];
    expect(heat.peak?.month).toBe("2026-03");
    expect(march).toMatchObject({ state: "data", level: 5 });
    expect(heat.rows[0].cells.filter((c) => c.state === "data").every((c) => c.level >= 1 && c.level <= 5)).toBe(true);
  });

  it("dashes this year's months still to come, holding what's scheduled", () => {
    expect(heat.rows[0].cells[10]).toEqual({ month: "2026-11", amount: 138500, state: "upcoming", level: 0 });
    expect(heat.rows[1].cells.every((c) => c.state === "data")).toBe(true);
  });

  it("totals each year with its average over the months so far", () => {
    const [now, then] = heat.totals;
    expect(now.months).toBe(10);
    expect(now.average).toBeCloseTo(now.total / 10);
    expect(then.months).toBe(12);
    expect(now.total).toBe(heat.rows[0].cells.reduce((t, c) => t + (c.state === "data" ? (c.amount ?? 0) : 0), 0));
  });

  it("follows the pick: only that source's months", () => {
    const fd = incomeHeatmap(data, TODAY, 2026, "demo-fd");
    expect(fd.rows[0].cells.filter((c) => c.state === "data").map((c) => c.month)).toEqual(["2026-01", "2026-04", "2026-07", "2026-10"]);
    expect(fd.rows[0].cells[1].state).toBe("no-data");
  });
});

describe("incomeMap", () => {
  const map = incomeMap(data, TODAY, 2026);

  it("sizes blocks by what each source paid this year, biggest first, the shares adding to 1", () => {
    expect(map.received.map((b) => b.id)).toEqual(["demo-salary", "demo-fd", "demo-tax", "demo-div"]);
    expect(map.received.reduce((t, b) => t + b.share, 0)).toBeCloseTo(1);
    expect(map.received[0].amount).toMatch(/so far$/);
  });

  it("sizes a usual month by each active source's amount over its cycle, leaving out one-time and inactive ones", () => {
    expect(map.usual.map((b) => [b.id, Math.round(b.value)])).toEqual([["demo-salary", 138500], ["demo-fd", 6133], ["demo-div", 2067]]);
    expect(map.leftOut.usual).toEqual([{ id: "demo-tax", name: "Tax refund", why: "inactive" }]);
  });

  it("chips each block with its next payday, how late it is, or done", () => {
    const chip = Object.fromEntries(map.received.map((b) => [b.id, b.chip]));
    expect(chip["demo-salary"]).toBe("Nov 1 · 8d");
    expect(chip["demo-div"]).toBe("14 days late");
    expect(chip["demo-tax"]).toBe("Done");
  });
});

describe("entriesCard", () => {
  const card = entriesCard(data, TODAY, ALL);

  it("puts what's still owed on top, then the latest received, eight at most", () => {
    expect(card.rows).toHaveLength(8);
    expect(card.rows[0]).toMatchObject({ name: "Dividends", when: "expected Oct 10", whenNote: "14 days ago", status: { text: "14 days late", tone: "late" } });
    expect(card.rows[1]).toMatchObject({ name: "FD interest", when: "Oct 5", whenNote: "on the day", status: { tone: "good" } });
  });

  it("marks a payment received late, and one read from a statement", () => {
    const tax = entriesCard(data, TODAY, "demo-tax").rows[0];
    expect(tax.status).toEqual({ text: "Received · 6 days late", tone: "warn" });
    expect(entriesCard(data, TODAY, "demo-salary").rows[0].fromStatement).toBe(true);
  });

  it("follows the pick, and lists pay changes newest first", () => {
    const fd = entriesCard(data, TODAY, "demo-fd");
    expect(fd.rows.every((r) => r.sourceId === "demo-fd")).toBe(true);
    expect(fd.changes[0]).toMatchObject({ name: "FD interest", change: "+13.6%", up: true, amounts: "₹16,200 → ₹18,400" });
    expect(card.note).toMatch(/^1 payment owed, then the 7 most recent of \d+ entries since Jan 2025$/);
    expect(entriesCard(data, TODAY, "demo-fd").note).toMatch(/^The 8 most recent of 8 entries since Jan 2025$/);
  });
});
