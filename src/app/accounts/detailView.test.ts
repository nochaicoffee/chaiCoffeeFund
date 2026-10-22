import { describe, expect, it } from "vitest";
import { thisYear } from "@/lib/aggregate/period";
import { demoAccountsData } from "@/lib/demo/accountsDemo";
import { detailFor } from "./detailView";

const today = "2026-10-22";
const data = demoAccountsData(today);
const all = detailFor(data, null, thisYear(today), today);

describe("detailFor", () => {
  it("adds up the bridge: start, what came in and went out, and the rest, to where it ends", () => {
    const steps = all.overTime.bridge;
    const start = steps[0].amount;
    const end = steps.at(-1)!.amount;
    const moved = steps.slice(1, -1).reduce((sum, s) => sum + s.amount, 0);
    expect(start + moved).toBeCloseTo(end, 6);
  });

  it("ends the bridge on what the accounts hold today", () => {
    expect(all.overTime.bridge.at(-1)!.amount).toBe(1078100);
  });

  it("makes saved came in less expenses, month by month and for the year", () => {
    for (const c of all.columns) expect(c.saved).toBe(c.cameIn - c.expenses);
    const year = all.columns.reduce((t, c) => t + c.saved, 0);
    expect(year).toBe(all.columns.reduce((t, c) => t + c.cameIn - c.expenses, 0));
    expect(all.tiles.map((t) => t.label)).toEqual(["Came in", "Expenses", "Invested", "Saved"]);
  });

  it("gives each month's total and the change that month, which add up to the year's", () => {
    const m = all.overTime.months;
    expect(m[0].key).toBe("2026-01");
    expect(m.at(-1)!.total).toBe(1078100);
    for (let i = 1; i < m.length; i++) expect(m[i].change).toBeCloseTo(m[i].total - m[i - 1].total, 6);
  });

  it("splits one account's numbers from All's, and only All has River", () => {
    const hdfc = detailFor(data, "demo-hdfc", thisYear(today), today);
    expect(hdfc.overTime.river).toBe(false);
    expect(all.overTime.river).toBe(true);
    expect(hdfc.tiles[0].value).not.toBe("₹0");
    expect(detailFor(data, "demo-kotak", thisYear(today), today).tiles[0].value).toBe("₹0");
  });

  it("lists what's coming for the pick, soonest first, marking a bill as about", () => {
    const coming = all.coming;
    expect(coming.length).toBeGreaterThan(0);
    expect(coming.some((c) => c.kind === "EMI")).toBe(true);
    expect(detailFor(data, "demo-axis", thisYear(today), today).coming.every((c) => c.account === "Axis EMI")).toBe(true);
  });
});
